"use client";

import { Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { type RegionScores, scoreRegionWithAPI } from "~/utils/genome-api";
import { GlossaryTerm } from "./glossary-term";
import { Button } from "./ui/button";

const TRACK_HEIGHT = 96;
// Odds of picking the right base out of four by chance
const CHANCE_LEVEL = 0.25;

export function LikelihoodTrack({
  sequenceData,
  sequenceRange,
  genomeId,
  chromosome,
  onPositionClick,
}: {
  sequenceData: string;
  sequenceRange: { start: number; end: number } | null;
  genomeId: string;
  chromosome: string;
  onPositionClick: (position: number, nucleotide: string) => void;
}) {
  const [scores, setScores] = useState<RegionScores | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latestRequest = useRef(0);
  const { resolvedTheme } = useTheme();

  // Scores belong to one loaded range, so drop them when the sequence changes
  useEffect(() => {
    latestRequest.current++;
    setScores(null);
    setIsScoring(false);
    setError(null);
    setHoverIndex(null);
  }, [sequenceData, sequenceRange]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    resizeObserver.observe(track);
    return () => resizeObserver.disconnect();
  }, []);

  const probabilities = useMemo(
    () =>
      scores?.scores.map((score) =>
        score === null ? null : Math.exp(score),
      ) ?? [],
    [scores],
  );

  const meanProbability = useMemo(() => {
    const scored = probabilities.filter((p) => p !== null);
    return scored.length > 0
      ? scored.reduce((sum, p) => sum + p, 0) / scored.length
      : null;
  }, [probabilities]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || width === 0 || probabilities.length === 0) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = TRACK_HEIGHT * pixelRatio;
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, TRACK_HEIGHT);

    const styles = getComputedStyle(canvas);
    context.fillStyle = styles.getPropertyValue("--primary").trim();

    // One bar per base when there is room, otherwise one per pixel column,
    // averaging the bases that share it. Edges land on whole pixels to avoid seams.
    const hasRoom = width / probabilities.length > 3;
    const columns = hasRoom ? probabilities.length : width;
    const gap = hasRoom ? 1 : 0;

    for (let column = 0; column < columns; column++) {
      const from = Math.floor((column * probabilities.length) / columns);
      const to = Math.max(
        from + 1,
        Math.floor(((column + 1) * probabilities.length) / columns),
      );

      let sum = 0;
      let count = 0;
      for (let i = from; i < to; i++) {
        const probability = probabilities[i];
        if (probability != null) {
          sum += probability;
          count++;
        }
      }
      if (count === 0) continue;

      const left = Math.round((column * width) / columns);
      const right = Math.round(((column + 1) * width) / columns);
      const barHeight = (sum / count) * TRACK_HEIGHT;
      context.fillRect(
        left,
        TRACK_HEIGHT - barHeight,
        right - left - gap,
        barHeight,
      );
    }

    const chanceY = Math.round(TRACK_HEIGHT * (1 - CHANCE_LEVEL)) + 0.5;
    context.strokeStyle = styles.getPropertyValue("--foreground").trim();
    context.lineWidth = 1;
    context.setLineDash([4, 4]);
    context.beginPath();
    context.moveTo(0, chanceY);
    context.lineTo(width, chanceY);
    context.stroke();
  }, [probabilities, width, resolvedTheme]);

  const scoreRegion = async () => {
    if (!sequenceRange) return;

    const request = ++latestRequest.current;
    setIsScoring(true);
    setError(null);

    try {
      const data = await scoreRegionWithAPI({
        start: sequenceRange.start,
        end: sequenceRange.end,
        genomeId,
        chromosome,
      });
      if (request === latestRequest.current) setScores(data);
    } catch (err) {
      console.error(err);
      if (request === latestRequest.current) {
        setError(
          "Failed to score region. The Evo2 scoring endpoint may not be deployed yet.",
        );
      }
    } finally {
      if (request === latestRequest.current) setIsScoring(false);
    }
  };

  const indexFromEvent = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.floor(
      ((e.clientX - rect.left) / rect.width) * probabilities.length,
    );
    return Math.max(0, Math.min(index, probabilities.length - 1));
  };

  const hoverScore = hoverIndex !== null ? scores?.scores[hoverIndex] : null;
  const hoverLeft =
    hoverIndex !== null
      ? ((hoverIndex + 0.5) / probabilities.length) * width
      : 0;

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">
          <GlossaryTerm term="likelihoodTrack">
            Evo2 likelihood track
          </GlossaryTerm>
        </span>
        {!scores && (
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-7 cursor-pointer px-3 text-sm"
            disabled={isScoring || !sequenceData}
            onClick={scoreRegion}
          >
            {isScoring ? (
              <>
                <span className="border-muted border-t-primary mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2"></span>
                Scoring...
              </>
            ) : (
              <>
                <Zap className="mr-1 inline-block h-3 w-3" />
                Score region with Evo2
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-2 rounded-md border p-3 text-sm">
          {error}
        </div>
      )}

      <div
        ref={trackRef}
        className="bg-muted/60 relative w-full rounded-md"
        style={{ height: TRACK_HEIGHT }}
      >
        {scores && sequenceRange ? (
          <>
            <canvas
              ref={canvasRef}
              className="block cursor-pointer rounded-md"
              style={{ width, height: TRACK_HEIGHT }}
              onMouseMove={(e) => setHoverIndex(indexFromEvent(e))}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={(e) => {
                const index = indexFromEvent(e);
                onPositionClick(
                  scores.start + index,
                  sequenceData[index] ?? "",
                );
              }}
            />
            {hoverIndex !== null && (
              <>
                <div
                  className="bg-foreground/50 pointer-events-none absolute top-0 h-full w-px"
                  style={{ left: hoverLeft }}
                ></div>
                <div
                  className="bg-primary text-primary-foreground pointer-events-none absolute z-10 rounded px-2 py-1 text-xs whitespace-nowrap shadow-md"
                  style={{
                    top: -30,
                    left: Math.max(110, Math.min(hoverLeft, width - 110)),
                    transform: "translateX(-50%)",
                  }}
                >
                  {(scores.start + hoverIndex).toLocaleString()}{" "}
                  {sequenceData[hoverIndex]} ·{" "}
                  {hoverScore == null
                    ? "no score"
                    : `probability ${Math.exp(hoverScore).toFixed(2)}`}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-muted-foreground flex h-full items-center justify-center px-3 text-center text-sm">
            Score the loaded region to see how strongly Evo2 expects each base.
          </p>
        )}
      </div>

      {scores && (
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Probability of each reference base given the DNA before it on the
          forward strand. The dashed line marks {CHANCE_LEVEL}, the chance level
          for four bases.
          {meanProbability !== null &&
            ` Average ${meanProbability.toFixed(2)} across ${probabilities.length.toLocaleString()} bases.`}{" "}
          Click a position to select it for variant analysis.
        </p>
      )}
    </div>
  );
}
