import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
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

  const moveRanking = async (id: string, direction: "up" | "down") => {
    if (!isOwnProfile) return;

    const currentIndex = animeList.findIndex((item) => item.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === animeList.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const newList = [...animeList];
    const [movedItem] = newList.splice(currentIndex, 1);
    newList.splice(newIndex, 0, movedItem);
    
    setAnimeList(newList);
    await updateRankings(newList);
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
        <p className="text-muted-foreground">No anime ranked yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {animeList.map((anime, index) => (
        <AnimeRankItem
          key={anime.id}
          anime={anime}
          rank={index + 1}
          isOwnProfile={isOwnProfile}
          onMoveUp={() => moveRanking(anime.id, "up")}
          onMoveDown={() => moveRanking(anime.id, "down")}
        />
      ))}
    </div>
  );
};

interface AnimeRankItemProps {
  anime: RankedAnime;
  rank: number;
  isOwnProfile: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const AnimeRankItem = ({
  anime,
  rank,
  isOwnProfile,
  onMoveUp,
  onMoveDown,
}: AnimeRankItemProps) => {
  return (
    <Card className="border-border/50 bg-card/50 hover:bg-card transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onMoveUp}
                  disabled={rank === 1}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onMoveDown}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-xl text-primary-foreground shadow-glow">
              #{rank}
            </div>
          </div>

          {anime.cover_image ? (
            <img
              src={anime.cover_image}
              alt={anime.title}
              className="w-20 h-28 object-cover rounded-lg"
            />
          ) : (
            <div className="w-20 h-28 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-3xl opacity-20">📺</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{anime.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize">
                {anime.status.replace("_", " ")}
              </Badge>
              {anime.rating && (
                <Badge variant="secondary">⭐ {anime.rating}/10</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnimeRanking;

