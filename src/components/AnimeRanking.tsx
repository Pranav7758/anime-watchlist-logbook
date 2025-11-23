import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Edit2 } from "lucide-react";
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

  const setRank = async (id: string, newRank: number) => {
    if (!isOwnProfile) return;

    const clickedAnime = animeList.find((item) => item.id === id);
    if (!clickedAnime) return;

    if (newRank < 1 || newRank > animeList.length) {
      toast.error(`Rank must be between 1 and ${animeList.length}`);
      return;
    }

    // Get all ranked anime (sorted by current rank)
    const rankedAnime = animeList.filter(a => a.ranking !== null && a.id !== id)
      .sort((a, b) => (a.ranking || 0) - (b.ranking || 0));
    
    // Get unranked anime
    const unrankedAnime = animeList.filter(a => a.ranking === null && a.id !== id);

    // Build new ordered list
    const newOrderedList: RankedAnime[] = [];
    
    // Insert ranked anime before the new position
    for (let i = 0; i < newRank - 1 && i < rankedAnime.length; i++) {
      newOrderedList.push(rankedAnime[i]);
    }
    
    // Insert the clicked anime at the desired position
    const updatedAnime = { ...clickedAnime, ranking: newRank };
    newOrderedList.push(updatedAnime);
    
    // Insert remaining ranked anime
    for (let i = newRank - 1; i < rankedAnime.length; i++) {
      newOrderedList.push(rankedAnime[i]);
    }
    
    // Add unranked anime at the end
    newOrderedList.push(...unrankedAnime);

    // Update local state immediately for instant UI update
    const updatedList = newOrderedList.map((anime, index) => ({
      ...anime,
      ranking: anime.ranking !== null ? index + 1 : null
    }));
    
    // Sort: ranked first (by ranking number), then unranked
    updatedList.sort((a, b) => {
      if (a.ranking !== null && b.ranking !== null) {
        return a.ranking - b.ranking;
      }
      if (a.ranking !== null) return -1;
      if (b.ranking !== null) return 1;
      return 0;
    });
    
    setAnimeList(updatedList);

    // Update rankings in database
    try {
      for (let i = 0; i < newOrderedList.length; i++) {
        const anime = newOrderedList[i];
        const ranking = anime.ranking !== null ? i + 1 : null;
        
        await supabase
          .from("anime")
          .update({ ranking })
          .eq("user_id", userId)
          .eq("title", anime.title);
      }

      toast.success(`${clickedAnime.title} is now ranked #${newRank}!`);
    } catch (error) {
      console.error("Error updating ranking:", error);
      toast.error("Failed to update ranking");
      // Revert on error
      fetchRankedAnime();
    }
  };

  const removeRanking = async (id: string) => {
    if (!isOwnProfile) return;

    const animeToUnrank = animeList.find(a => a.id === id);
    if (!animeToUnrank) return;

    // Update local state immediately
    const updatedList = animeList.map(anime => 
      anime.id === id ? { ...anime, ranking: null } : anime
    );
    
    // Re-sort: ranked first, then unranked
    updatedList.sort((a, b) => {
      if (a.ranking !== null && b.ranking !== null) {
        return a.ranking - b.ranking;
      }
      if (a.ranking !== null) return -1;
      if (b.ranking !== null) return 1;
      return 0;
    });
    
    // Re-number remaining ranked anime
    let rankCounter = 1;
    const finalList = updatedList.map(anime => {
      if (anime.ranking !== null) {
        return { ...anime, ranking: rankCounter++ };
      }
      return anime;
    });
    
    setAnimeList(finalList);

    try {
      // Remove ranking from this anime (set to null)
      await supabase
        .from("anime")
        .update({ ranking: null })
        .eq("user_id", userId)
        .eq("title", animeToUnrank.title);

      // Update remaining ranked anime
      for (const anime of finalList) {
        if (anime.ranking !== null) {
          await supabase
            .from("anime")
            .update({ ranking: anime.ranking })
            .eq("user_id", userId)
            .eq("title", anime.title);
        }
      }

      toast.success("Ranking removed");
    } catch (error) {
      console.error("Error removing ranking:", error);
      toast.error("Failed to remove ranking");
      // Revert on error
      fetchRankedAnime();
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
            💡 <strong>Tip:</strong> Click on the rank number (#) to set any anime to any rank position. It will automatically shift other rankings.
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
            totalAnime={animeList.length}
            onSetRank={(rank) => setRank(anime.id, rank)}
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
  totalAnime: number;
  onSetRank: (rank: number) => void;
  onRemoveRanking: () => void;
}

const AnimeRankItem = ({
  anime,
  rank,
  isRanked,
  isOwnProfile,
  totalAnime,
  onSetRank,
  onRemoveRanking,
}: AnimeRankItemProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [rankInput, setRankInput] = useState(rank.toString());

  const handleSetRank = () => {
    const newRank = parseInt(rankInput);
    if (isNaN(newRank) || newRank < 1 || newRank > totalAnime) {
      toast.error(`Please enter a number between 1 and ${totalAnime}`);
      return;
    }
    onSetRank(newRank);
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <Card 
        className={`border-border/50 bg-card/50 hover:bg-card transition-colors ${isOwnProfile ? 'cursor-pointer' : ''}`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {isOwnProfile ? (
              <div 
                className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg sm:text-xl text-primary-foreground shadow-glow hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => {
                  setRankInput(rank.toString());
                  setIsEditDialogOpen(true);
                }}
                title="Click to change rank"
              >
                #{rank}
              </div>
            ) : (
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg sm:text-xl text-primary-foreground shadow-glow">
                #{rank}
              </div>
            )}

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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRankInput(rank.toString());
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Edit Rank
                </Button>
                {isRanked && (
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
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Rank for {anime.title}</DialogTitle>
          <DialogDescription>
            Enter a rank number between 1 and {totalAnime}. Other rankings will be automatically adjusted.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="number"
            min="1"
            max={totalAnime}
            value={rankInput}
            onChange={(e) => setRankInput(e.target.value)}
            placeholder={`Enter rank (1-${totalAnime})`}
            className="text-center text-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSetRank();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSetRank}>
            Set Rank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AnimeRanking;

