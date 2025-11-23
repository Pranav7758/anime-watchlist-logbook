import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Plus, Search, Trophy, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnimeRanking from "@/components/AnimeRanking";
import Friends from "@/components/Friends";
import { toast } from "sonner";
import AnimeCard from "@/components/AnimeCard";
import AnimeGroupCard from "@/components/AnimeGroupCard";
import AddAnimeDialog, { AnimeFormData } from "@/components/AddAnimeDialog";
import Notifications from "@/components/Notifications";
import { checkAnimeUpdates } from "@/services/animeUpdates";
import Footer from "@/components/Footer";

interface Anime {
  id: string;
  title: string;
  episodes_watched: number;
  total_episodes: number | null;
  status: string;
  rating: number | null;
  notes: string;
  cover_image: string | null;
  season_number: number;
  mal_id: number | null;
  ranking: number | null;
  is_hentai: boolean | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [filteredAnimeList, setFilteredAnimeList] = useState<Anime[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hentaiFilter, setHentaiFilter] = useState<string>("show"); // "hide", "show", "only" - default to "show all"
  const [rankingFilter, setRankingFilter] = useState<string>("all"); // "all", "ranked", "unranked"
  const [friendFilter, setFriendFilter] = useState<string>("my-list"); // Friend user ID to filter by, "my-list" means own list
  const [friendsList, setFriendsList] = useState<Array<{id: string, name: string}>>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState<(Anime & AnimeFormData) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      try {
        fetchAnimeList();
        
        // Check for anime updates when user loads the page
        const checkUpdates = async () => {
          try {
            const result = await checkAnimeUpdates(user.id);
            if (result && (result.updates > 0 || result.newSeasons > 0)) {
              toast.success(
                `Found ${result.updates} new episode${result.updates !== 1 ? 's' : ''} and ${result.newSeasons} new season${result.newSeasons !== 1 ? 's' : ''}!`
              );
              // Refresh the anime list to show new seasons
              fetchAnimeList();
            }
          } catch (error) {
            console.error("Error checking updates:", error);
          }
        };
        
        // Check updates after a short delay to avoid blocking initial load
        const updateTimeout = setTimeout(checkUpdates, 2000);
        
        // Set up periodic checks (every 30 minutes)
        const updateInterval = setInterval(checkUpdates, 30 * 60 * 1000);
        
        return () => {
          clearTimeout(updateTimeout);
          clearInterval(updateInterval);
        };
      } catch (error) {
        console.error("Error in user effect:", error);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFriendsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAnimeList([]);
      return;
    }
    
    // Only fetch own list when on "My List" tab
    if (activeTab === "list") {
      try {
        fetchAnimeList();
      } catch (error) {
        console.error("Error fetching anime list:", error);
        setAnimeList([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  useEffect(() => {
    filterAnimeList();
  }, [searchQuery, statusFilter, hentaiFilter, rankingFilter, animeList]);

  const fetchAnimeList = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("anime")
      .select("*")
      .eq("user_id", user.id) // Only fetch current user's anime
      .order("ranking", { ascending: true, nullsLast: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load anime list");
      return;
    }

    setAnimeList(data || []);
  };

  const fetchFriendAnimeList = async (friendId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("anime")
      .select("*")
      .eq("user_id", friendId) // Fetch friend's anime
      .order("ranking", { ascending: true, nullsLast: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load friend's anime list");
      return;
    }

    setAnimeList(data || []);
  };

  const fetchFriendsList = async () => {
    if (!user) return;
    
    try {
      // Get accepted friends
      const { data: accepted, error } = await supabase
        .from("friends")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (error) throw error;

      // Get friend IDs and fetch their names
      const friendIds = new Set<string>();
      (accepted || []).forEach((f) => {
        if (f.user_id === user.id) {
          friendIds.add(f.friend_id);
        } else {
          friendIds.add(f.user_id);
        }
      });

      // Fetch friend names from profiles
      const friendsWithNames = await Promise.all(
        Array.from(friendIds).map(async (friendId) => {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", friendId)
              .single();
            
            return {
              id: friendId,
              name: profile?.name || `User ${friendId.slice(0, 8)}`,
            };
          } catch (err) {
            // If profiles table doesn't exist or error, use fallback
            return {
              id: friendId,
              name: `User ${friendId.slice(0, 8)}`,
            };
          }
        })
      );

      setFriendsList(friendsWithNames);
    } catch (error) {
      console.error("Error fetching friends list:", error);
      setFriendsList([]); // Set empty array on error to prevent crashes
    }
  };

  const filterAnimeList = () => {
    let filtered = animeList;

    if (searchQuery) {
      filtered = filtered.filter((anime) =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((anime) => anime.status === statusFilter);
    }

    // Filter hentai based on preference
    if (hentaiFilter === "hide") {
      filtered = filtered.filter((anime) => !anime.is_hentai); // Hide hentai (false or null)
    } else if (hentaiFilter === "only") {
      filtered = filtered.filter((anime) => anime.is_hentai === true); // Show only hentai
    }
    // "show" means show all, no filtering needed

    // Filter by ranking
    if (rankingFilter === "ranked") {
      filtered = filtered.filter((anime) => anime.ranking !== null);
    } else if (rankingFilter === "unranked") {
      filtered = filtered.filter((anime) => anime.ranking === null);
    }
    // "all" means show all, no filtering needed

    setFilteredAnimeList(filtered);
  };

  // Group anime by title
  const groupedAnime = (filteredAnimeList || []).reduce((groups, anime) => {
    const title = anime.title;
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(anime);
    return groups;
  }, {} as Record<string, Anime[]>);

  const handleAddAnime = async (data: AnimeFormData) => {
    // If we have individual season data with selections, use that
    if (data.seasons && data.seasons.length > 0) {
      const selectedSeasons = data.seasons.filter(s => s.selected);
      
      if (selectedSeasons.length === 0) {
        toast.error("Please select at least one season to add");
        return;
      }
      
      // Create entries for each selected season with their individual episode counts and watched episodes
      const seasonsToAdd = selectedSeasons.map((season) => {
        const entry: any = {
          user_id: user!.id,
          title: data.title,
          episodes_watched: season.episodesWatched || 0, // Use the episodes watched value from each season
          total_episodes: season.episodes, // Use the correct episode count for each season
          status: data.status,
          rating: data.rating,
          notes: data.notes,
          cover_image: data.coverImage || null,
          season_number: season.seasonNumber,
        };
        
        // Only add mal_id if it exists (in case migration hasn't been run)
        if (season.mal_id) {
          entry.mal_id = season.mal_id;
        }
        
        // Add is_hentai flag from form data (applies to all seasons)
        if (data.isHentai !== undefined) {
          entry.is_hentai = data.isHentai;
        }
        
        return entry;
      });

      const { error } = await supabase.from("anime").insert(seasonsToAdd);

      if (error) {
        console.error("Error adding anime:", error);
        toast.error(`Failed to add anime: ${error.message || "Unknown error"}`);
        throw error;
      }

      toast.success(`${selectedSeasons.length} season${selectedSeasons.length !== 1 ? 's' : ''} added successfully!`);
      fetchAnimeList();
      return;
    }
    
    // Fallback to old behavior if no season data
    const numberOfSeasons = data.numberOfSeasons || 1;
    
    // Create entries for all seasons
    const seasonsToAdd = Array.from({ length: numberOfSeasons }, (_, i) => {
      const entry: any = {
        user_id: user!.id,
        title: data.title,
        episodes_watched: data.episodesWatched,
        total_episodes: data.totalEpisodes,
        status: data.status,
        rating: data.rating,
        notes: data.notes,
        cover_image: data.coverImage || null,
        season_number: i + 1,
        is_hentai: data.isHentai || false, // Use form data or default to false
      };
      return entry;
    });

    const { error } = await supabase.from("anime").insert(seasonsToAdd);

    if (error) {
      toast.error("Failed to add anime");
      throw error;
    }

    toast.success(`${numberOfSeasons} season${numberOfSeasons !== 1 ? 's' : ''} added successfully!`);
    fetchAnimeList();
  };

  const handleEditAnime = async (data: AnimeFormData) => {
    if (!editingAnime) return;

    const { error } = await supabase
      .from("anime")
      .update({
        title: data.title,
        episodes_watched: data.episodesWatched,
        total_episodes: data.totalEpisodes,
        status: data.status,
        rating: data.rating,
        notes: data.notes,
        cover_image: data.coverImage || null,
        season_number: data.seasonNumber,
      })
      .eq("id", editingAnime.id);

    if (error) {
      toast.error("Failed to update anime");
      throw error;
    }

    toast.success("Anime updated successfully!");
    setEditingAnime(null);
    fetchAnimeList();
  };

  const handleDeleteAnime = async (id: string) => {
    const { error } = await supabase.from("anime").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete anime");
      return;
    }

    toast.success("Anime deleted successfully!");
    fetchAnimeList();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const anime = animeList.find((a) => a.id === id);
    if (!anime) return;

    const updates: any = { status: newStatus };
    if (newStatus === "completed" && anime.total_episodes) {
      updates.episodes_watched = anime.total_episodes;
    }

    const { error } = await supabase
      .from("anime")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Status updated!");
    fetchAnimeList();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const openEditDialog = (id: string) => {
    const anime = animeList.find((a) => a.id === id);
    if (!anime) return;

    setEditingAnime({
      ...anime,
      title: anime.title,
      episodesWatched: anime.episodes_watched,
      totalEpisodes: anime.total_episodes,
      status: anime.status,
      rating: anime.rating,
      notes: anime.notes,
      coverImage: anime.cover_image || "",
      seasonNumber: anime.season_number,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">📺</div>
          <p className="text-muted-foreground">Loading your anime collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AnimeTracker
            </h1>
            <div className="flex items-center gap-2">
              {user && <Notifications userId={user.id} />}
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="hover:bg-destructive hover:text-destructive-foreground transition-smooth"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 pb-8 flex-1">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Reset friend filter when switching to "My List" tab
          if (value === "list") {
            setFriendFilter("my-list");
          }
        }} className="w-full">
          <div className="mb-6 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="list">My List</TabsTrigger>
              <TabsTrigger value="ranking">
                <Trophy className="w-4 h-4 mr-2" />
                Rankings
              </TabsTrigger>
              <TabsTrigger value="friends">
                <Users className="w-4 h-4 mr-2" />
                Friends
              </TabsTrigger>
            </TabsList>
            {activeTab === "list" && (
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="gradient-primary hover:opacity-90 transition-smooth shadow-glow"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Anime
              </Button>
            )}
          </div>

          <TabsContent value="list" className="space-y-4">
            <div className="mb-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="watching">Watching</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="plan_to_watch">Plan to Watch</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={hentaiFilter} onValueChange={setHentaiFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Hentai filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show">Show All</SelectItem>
                    <SelectItem value="hide">Hide Hentai</SelectItem>
                    <SelectItem value="only">Hentai Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={rankingFilter} onValueChange={setRankingFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Ranking filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Anime</SelectItem>
                    <SelectItem value="ranked">Ranked Only</SelectItem>
                    <SelectItem value="unranked">Unranked Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredAnimeList.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="text-8xl opacity-20">📺</div>
                <h2 className="text-2xl font-bold text-foreground">
                  No anime found
                </h2>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || hentaiFilter !== "show" || rankingFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Start by adding your first anime!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                {Object.entries(groupedAnime).map(([title, seasons]) => (
                  <AnimeGroupCard
                    key={title}
                    title={title}
                    coverImage={seasons[0].cover_image}
                    seasons={seasons.map(s => ({
                      id: s.id,
                      seasonNumber: s.season_number,
                      episodesWatched: s.episodes_watched,
                      totalEpisodes: s.total_episodes,
                      status: s.status,
                      rating: s.rating,
                      notes: s.notes,
                    }))}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteAnime}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">My Anime Rankings</h2>
              <p className="text-muted-foreground">
                Rank your favorite anime! Use the arrows to reorder your list.
              </p>
            </div>
            {user && <AnimeRanking userId={user.id} isOwnProfile={true} />}
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            {user && <Friends currentUserId={user.id} />}
          </TabsContent>
        </Tabs>
      </main>

      <AddAnimeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddAnime}
      />

      {editingAnime && (
        <AddAnimeDialog
          open={!!editingAnime}
          onOpenChange={(open) => !open && setEditingAnime(null)}
          onSubmit={handleEditAnime}
          initialData={editingAnime}
          isEditing
        />
      )}
      <Footer />
    </div>
  );
};

export default Index;
