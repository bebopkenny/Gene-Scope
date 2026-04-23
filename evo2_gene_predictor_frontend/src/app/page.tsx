'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import GeneViewer from "~/components/gene-viewer";
import { Hero } from "~/components/hero";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { type ChromosomeFromSearch, type GeneFromSearch, type GenomeAssemblyFromSearch, getAvailableGenomes, getGenomeChromosomes, searchGenes } from "~/utils/genome-api";

type Mode = "browse" | "search"

export default function HomePage() {
  const [genomes, setGenomes] = useState<GenomeAssemblyFromSearch[]>([]);
  const [selectedGenome, setSelectedGenome] = useState<string>("hg38");
  const [chromosomes, setChromosomes] = useState<ChromosomeFromSearch[]>([]);
  const [selectedChromosome, setSelectedChromosome] = useState<string>("chr1");
  const [selectedGene, setSelectedGene] = useState<GeneFromSearch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeneFromSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("search");

  useEffect(() => {
    const fetchGenomes = async() => {
      try {
        setIsLoading(true)
        const data = await getAvailableGenomes();
        if (data.genomes && data.genomes["Human"]) {
          setGenomes(data.genomes["Human"])
        }
      } catch(err) {
        setError("failed to load genome data")
      }  finally {
        setIsLoading(false)
      }
    };
    fetchGenomes();
  }, []);

    useEffect(() => {
    const fetchChromosomes = async() => {
      try {
        setIsLoading(true)
        const data = await getGenomeChromosomes(selectedGenome);
        setChromosomes(data.chromosomes)
        console.log(data.chromosomes)
        if (data.chromosomes.length > 0) {
          setSelectedChromosome(data.chromosomes[0]!.name);
        }
      } catch(err) {
        setError("failed to load chromosome data")
      }  finally {
        setIsLoading(false)
      }
    };
    fetchChromosomes();
  }, [selectedGenome]);

  const performGeneSearch = async (query: string, genome: string, filterFn?: (gene: GeneFromSearch) => boolean 
  ) => {
    try {
      setIsLoading(true);
      const data = await searchGenes(query, genome);
      const results = filterFn ? data.results.filter(filterFn) : data.results;
      console.log("Filtered Gene Results", results);
      setSearchResults(results);
    } catch (err) {
      setError("Failed to search through genes")
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedChromosome || mode !== "browse") return;
    performGeneSearch(
      selectedChromosome,
      selectedGenome,
      (gene: GeneFromSearch) => gene.chrom === selectedChromosome,
    )
  }, [selectedChromosome, selectedGenome, mode])

  const handleGenomeChange = (value: string) => {
    
    setSelectedGenome(value);
    setSearchResults([]);
    setSelectedGene(null);
  }

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;

    setSearchResults([]);
    setSelectedGene(null);
    setError(null);

    if (newMode === "browse" && selectedChromosome) {
      performGeneSearch(
        selectedChromosome,
        selectedGenome,
        (gene: GeneFromSearch) => gene.chrom === selectedChromosome
      );
    }

    setMode(newMode);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    performGeneSearch(searchQuery, selectedGenome);
  }

  
  const loadBRCA1Example = () => {
    setMode("search");
    setSearchQuery("BRCA1");
    performGeneSearch("BRCA1", selectedGenome);

  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h1 className="text-xl font-light tracking-wide text-foreground">
                <span className="font-normal">EVO</span>
                <span className="text-primary">2</span>
              </h1>
              <div className="absolute -bottom-1 left-0 h-[2px] w-12 bg-primary"></div>
            </div>
            <span className="text-sm font-light text-muted-foreground">Gene Predictor</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto px-6 py-6">
        {selectedGene ? (
          <GeneViewer 
            gene={selectedGene} 
            genomeId={selectedGenome} 
            onClose={() => setSelectedGene(null)} 
          /> 
        ) : (
        <>
          <Card className="mb-6 gap-0 border-none bg-card py-0 shadow-sm">
          <CardHeader className="pt-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Genome Assembly
            </CardTitle>
            <div className="text-xs text-muted-foreground">Organism: <span className="font-medium text-foreground">Human</span></div>
          </div>
          </CardHeader>

        <CardContent className="pb-4 ">
          <Select
            value={selectedGenome}
            onValueChange={handleGenomeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="h-9 w-full border-border">
              <SelectValue placeholder="Select genome assembly" />
            </SelectTrigger>
            <SelectContent>
              {genomes.map((genome) => (
                <SelectItem key={genome.id} value={genome.id}>
                  {genome.id} - {genome.name}
                  {genome.active ? " (active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGenome && (
            <p className="mt-2 text-xs text-muted-foreground">
              {
                genomes.find((genome) => genome.id === selectedGenome)
                ?.sourceName
              }
            </p>
          )}
        </CardContent>
        </Card>

        <Card className="gap-0 mt-6 border-none bg-card py-0 shadow-sm">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Browse
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <Tabs
              value={mode}
              onValueChange={(value) => switchMode(value as Mode)}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="search" className="data-[state=active]:text-primary">
                  Search Genes
                </TabsTrigger>
                <TabsTrigger value="browse" className="data-[state=active]:text-primary">
                  Browse Chromosomes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="search" className="mt-0">
                <div className="space-y-4">
                  <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="Enter gene symbol or name"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 border-border pr-10"
                        />
                          <Button
                              type="submit"
                              className="absolute top-0 right-0 h-full cursor-pointer rounded-l-none bg-primary text-primary-foreground hover:bg-primary/90"
                              size="icon"
                              disabled={isLoading || !searchQuery.trim()}
                          >
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Search</span>
                          </Button>
                      </div>
                    </form>
                    <Button
                      variant="link"
                      className="h-auto cursor-pointer p-0 text-primary hover:text-primary/80"
                      onClick={loadBRCA1Example}
                    >
                        Try BRCA1 example
                    </Button>
                </div>
              </TabsContent>
              <TabsContent value="browse" className="mt-0">
                <div className="max-h-[150px] overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {chromosomes.map((chrom) => (
                      <Button
                        key={chrom.name}
                        variant="outline"
                        size="sm"
                        className={`h-8 cursor-pointer border-border hover:bg-accent hover:text-accent-foreground ${selectedChromosome === chrom.name ? "bg-accent text-accent-foreground" : ""}`}
                        onClick={() => setSelectedChromosome(chrom.name)}
                      >{chrom.name}</Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {searchResults.length > 0 && !isLoading && (
              <div className="mt-6">
                <div className="mb-2">
                  <h4 className="text-xs font-normal text-muted-foreground">
                    {mode === "search" ? (
                      <>
                        Search Results:{" "}
                        <span className="font-medium text-foreground">{searchResults.length} genes</span>
                      </>
                    ) : (
                      <>
                        Genes on {selectedChromosome}:{" "}
                        <span className="font-medium text-foreground">{searchResults.length} found</span>
                      </>
                    )}
                  </h4>
                </div>


                <div className="overflow-hidden rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60 hover:bg-muted">
                        <TableHead className="text-xs text-muted-foreground font-normal">
                          Symbol
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground font-normal">
                          Name
                        </TableHead>
                        <TableHead className="text-xs text-muted-foreground font-normal">
                          Location
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((gene, index) => (
                        <TableRow
                          key={`${gene.symbol}-${index}`}
                          className="cursor-pointer border-b border-border hover:bg-accent/50"
                          onClick={() => setSelectedGene(gene)}
                        >
                          <TableCell className="py-2 font-medium text-foreground">{gene.symbol}</TableCell>
                          <TableCell className="py-2 font-medium text-foreground">{gene.name}</TableCell>
                          <TableCell className="py-2 font-medium text-foreground">{gene.chrom}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!isLoading && !error && searchResults.length === 0 && (
              <Hero mode={mode} selectedChromosome={selectedChromosome} />
            )}
          </CardContent>
        </Card>
        </>
        )}
      </main>
    </div>
  );
}