import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RankedAnime {
  id: string;
  title: string;
  cover_image: string | null;
  ranking: number | null;
  status: string;
  rating: number | null;
}

interface AnimeRankingProps {
  userId: string;
  isOwnProfile?: boolean;
}

const AnimeRanking = ({ userId, isOwnProfile = true }: AnimeRankingProps) => {
  const [animeList, setAnimeList] = useState<RankedAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankedAnime = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("anime")
        .select("id, title, cover_image, ranking, status, rating")
        .eq("user_id", userId)
        .order("ranking", { ascending: true, nullsLast: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by title and get the first season for each anime
      const grouped = (data || []).reduce((acc, anime) => {
        if (!acc[anime.title]) {
          acc[anime.title] = anime;
        }
        return acc;
      }, {} as Record<string, RankedAnime>);

      const ranked = Object.values(grouped);
      
      // Sort: ranked first (by ranking number), then unranked (by created_at)
      ranked.sort((a, b) => {
        if (a.ranking !== null && b.ranking !== null) {
          return a.ranking - b.ranking;
        }
        if (a.ranking !== null) return -1;
        if (b.ranking !== null) return 1;
        return 0; // Both unranked, keep original order
      });
      
      setAnimeList(ranked);
    } catch (error) {
      console.error("Error fetching ranked anime:", error);
      toast.error("Failed to load anime rankings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankedAnime();
  }, [userId]);

  const updateRankings = async (newList: RankedAnime[]) => {
    try {
      // Update all rankings
      for (let i = 0; i < newList.length; i++) {
        const ranking = i + 1;
        // Update all seasons of this anime with the same ranking
        await supabase
          .from("anime")
          .update({ ranking })
          .eq("user_id", userId)
          .eq("title", newList[i].title);
      }

      toast.success("Ranking updated!");
    } catch (error) {
      console.error("Error updating rankings:", error);
      toast.error("Failed to update ranking");
      fetchRankedAnime(); // Revert on error
    }
  };

  const setAsRankOne = async (id: string) => {
    if (!isOwnProfile) return;

    const clickedAnime = animeList.find((item) => item.id === id);
    if (!clickedAnime) return;

    // If already rank 1, do nothing
    if (clickedAnime.ranking === 1) {
      toast.info("This anime is already ranked #1");
      return;
    }

    // Create new list with clicked anime as rank 1
    const otherAnime = animeList.filter((item) => item.id !== id);
    const newList = [clickedAnime, ...otherAnime];
    
    setAnimeList(newList);
    await updateRankings(newList);
    toast.success(`${clickedAnime.title} is now ranked #1!`);
  };

  const removeRanking = async (id: string) => {
    if (!isOwnProfile) return;

    try {
      // Remove ranking from this anime (set to null)
      await supabase
        .from("anime")
        .update({ ranking: null })
        .eq("user_id", userId)
        .eq("title", animeList.find(a => a.id === id)?.title);

      toast.success("Ranking removed");
      fetchRankedAnime(); // Refresh the list
    } catch (error) {
      console.error("Error removing ranking:", error);
      toast.error("Failed to remove ranking");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading rankings...</p>
      </div>
    );
  }

  if (animeList.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No anime found. Add some anime to start ranking!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isOwnProfile && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Click on any anime card to set it as Rank #1. It will automatically shift other rankings.
          </p>
        </div>
      )}
      {animeList.map((anime, index) => {
        const currentRank = anime.ranking || null;
        const displayRank = currentRank || index + 1;
        return (
          <AnimeRankItem
            key={anime.id}
            anime={anime}
            rank={displayRank}
            isRanked={currentRank !== null}
            isOwnProfile={isOwnProfile}
            onSetAsRankOne={() => setAsRankOne(anime.id)}
            onRemoveRanking={() => removeRanking(anime.id)}
          />
        );
      })}
    </div>
  );
};

interface AnimeRankItemProps {
  anime: RankedAnime;
  rank: number;
  isRanked: boolean;
  isOwnProfile: boolean;
  onSetAsRankOne: () => void;
  onRemoveRanking: () => void;
}

const AnimeRankItem = ({
  anime,
  rank,
  isRanked,
  isOwnProfile,
  onSetAsRankOne,
  onRemoveRanking,
}: AnimeRankItemProps) => {
  return (
    <Card 
      className={`border-border/50 bg-card/50 hover:bg-card transition-colors cursor-pointer ${isOwnProfile && !isRanked ? 'hover:ring-2 hover:ring-primary' : ''}`}
      onClick={isOwnProfile && !isRanked ? onSetAsRankOne : undefined}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg sm:text-xl text-primary-foreground shadow-glow">
            #{rank}
          </div>

          {anime.cover_image ? (
            <img
              src={anime.cover_image}
              alt={anime.title}
              className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-2xl sm:text-3xl opacity-20">📺</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">{anime.title}</h3>
            <div className="flex items-center gap-2 mt-1 sm:mt-2 flex-wrap">
              <Badge variant="outline" className="capitalize text-xs">
                {anime.status.replace("_", " ")}
              </Badge>
              {anime.rating && (
                <Badge variant="secondary" className="text-xs">⭐ {anime.rating}/10</Badge>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              {isRanked ? (
                <>
                  {rank === 1 && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetAsRankOne();
                      }}
                    >
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      #1
                    </Button>
                  )}
                  {rank !== 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetAsRankOne();
                      }}
                    >
                      Set #1
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 sm:h-9 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRanking();
                    }}
                  >
                    Unrank
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetAsRankOne();
                  }}
                >
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Rank #1
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnimeRanking;

