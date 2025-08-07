import type { GeneBounds, GeneDetailsFromSearch, GeneFromSearch } from "~/utils/genome-api"
import { Card, CardHeader, CardTitle } from "./ui/card"

export function GeneInformation({gene, geneDetail, geneBounds} : {gene: GeneFromSearch, geneDetail: GeneDetailsFromSearch | null, geneBounds: GeneBounds | null})

{ return (
    <Card className="gap-0 border-none bg-white py-0 shadow-sm">
        <CardHeader>
            <CardTitle></CardTitle>
     </CardHeader>
    </Card>

    )
}