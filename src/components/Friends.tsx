import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Check, X, Users, UserSearch, Search } from "lucide-react";
import { toast } from "sonner";
import AnimeRanking from "./AnimeRanking";
import AnimeGroupCard from "./AnimeGroupCard";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "rejected" | "blocked";
  friend_email?: string;
  friend_name?: string;
}

interface FriendsProps {
  currentUserId: string;
}

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

const Friends = ({ currentUserId }: FriendsProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Friend anime list viewer state
  const [friendAnimeList, setFriendAnimeList] = useState<Anime[]>([]);
  const [filteredFriendAnimeList, setFilteredFriendAnimeList] = useState<Anime[]>([]);
  const [selectedFriendForList, setSelectedFriendForList] = useState<string>("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendStatusFilter, setFriendStatusFilter] = useState<string>("all");
  const [friendHentaiFilter, setFriendHentaiFilter] = useState<string>("show");
  const [friendRankingFilter, setFriendRankingFilter] = useState<string>("all");

  const fetchFriends = async () => {
    try {
      // Get accepted friends (both directions)
      const { data: accepted, error } = await supabase
        .from("friends")
        .select("*")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq("status", "accepted");

      if (error) throw error;

      // Get friend IDs
      const friendIds = new Set<string>();
      (accepted || []).forEach((f) => {
        if (f.user_id === currentUserId) {
          friendIds.add(f.friend_id);
        } else {
          friendIds.add(f.user_id);
        }
      });

      // Fetch friend names from profiles table
      const friendsWithDetails = await Promise.all(
        Array.from(friendIds).map(async (friendId) => {
          // Get friend profile (name)
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", friendId)
            .single();
          
          // Get friend email for display
          const { data: emailData } = await supabase
            .rpc('get_user_email', { user_uuid: friendId });
          
          const friendName = profile?.name || emailData?.split("@")[0] || `User ${friendId.slice(0, 8)}`;
          const friendEmail = emailData || "";
          
          // Find the friend record
          const friendRecord = accepted?.find(
            (f) => (f.user_id === currentUserId && f.friend_id === friendId) ||
                   (f.friend_id === currentUserId && f.user_id === friendId)
          );
          
          return {
            ...friendRecord!,
            friend_email: friendEmail,
            friend_name: friendName,
          };
        })
      );

      // Get pending requests sent to me
      const { data: pending } = await supabase
        .from("friends")
        .select("*")
        .eq("friend_id", currentUserId)
        .eq("status", "pending");

      // Get requests I sent
      const { data: sent } = await supabase
        .from("friends")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("status", "pending");

      // Fetch names for pending requests
      const pendingWithDetails = await Promise.all(
        (pending || []).map(async (req) => {
          // Get user profile (name)
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", req.user_id)
            .single();
          
          const { data: emailData } = await supabase
            .rpc('get_user_email', { user_uuid: req.user_id });
          
          const friendName = profile?.name || emailData?.split("@")[0] || `User ${req.user_id.slice(0, 8)}`;
          const friendEmail = emailData || "";
          
          return {
            ...req,
            friend_email: friendEmail,
            friend_name: friendName,
          };
        })
      );

      setPendingRequests(pendingWithDetails);
      setSentRequests(sent || []);
      setFriends(friendsWithDetails);
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error("Failed to load friends");
    }
  };

  const fetchFriendAnimeList = async (friendId: string) => {
    try {
      const { data, error } = await supabase
        .from("anime")
        .select("*")
        .eq("user_id", friendId)
        .order("ranking", { ascending: true, nullsLast: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFriendAnimeList(data || []);
    } catch (error) {
      console.error("Error fetching friend's anime list:", error);
      toast.error("Failed to load friend's anime list");
      setFriendAnimeList([]);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [currentUserId]);

  useEffect(() => {
    if (selectedFriendForList) {
      fetchFriendAnimeList(selectedFriendForList);
    } else {
      setFriendAnimeList([]);
      setFilteredFriendAnimeList([]);
    }
  }, [selectedFriendForList]);

  useEffect(() => {
    let filtered = friendAnimeList;

    if (friendSearchQuery) {
      filtered = filtered.filter((anime) =>
        anime.title.toLowerCase().includes(friendSearchQuery.toLowerCase())
      );
    }

    if (friendStatusFilter !== "all") {
      filtered = filtered.filter((anime) => anime.status === friendStatusFilter);
    }

    if (friendHentaiFilter === "hide") {
      filtered = filtered.filter((anime) => !anime.is_hentai);
    } else if (friendHentaiFilter === "only") {
      filtered = filtered.filter((anime) => anime.is_hentai === true);
    }

    if (friendRankingFilter === "ranked") {
      filtered = filtered.filter((anime) => anime.ranking !== null);
    } else if (friendRankingFilter === "unranked") {
      filtered = filtered.filter((anime) => anime.ranking === null);
    }

    setFilteredFriendAnimeList(filtered);
  }, [friendAnimeList, friendSearchQuery, friendStatusFilter, friendHentaiFilter, friendRankingFilter]);

  // Group friend anime by title
  const groupedFriendAnime = filteredFriendAnimeList.reduce((groups, anime) => {
    const title = anime.title;
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(anime);
    return groups;
  }, {} as Record<string, Anime[]>);

  const sendFriendRequestByUserId = async (friendUserId: string) => {
    if (friendUserId === currentUserId) {
      toast.error("You can't add yourself as a friend");
      return;
    }

    setIsLoading(true);
    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from("friends")
        .select("*")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === "accepted") {
          toast.error("Already friends!");
        } else if (existing.status === "pending") {
          toast.error("Friend request already sent");
        }
        return;
      }

      const { error } = await supabase.from("friends").insert({
        user_id: currentUserId,
        friend_id: friendUserId,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Friend request sent!");
      setSearchEmail("");
      fetchFriends();
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast.error(error.message || "Failed to send friend request");
    } finally {
      setIsLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Friend request accepted!");
      fetchFriends();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Friend request rejected");
      fetchFriends();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject friend request");
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">My Friends</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="find">Find Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          <div className="space-y-6">
            {/* Friend Selection and Anime List Viewer */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">View Friend's Anime List</h3>
                <Select value={selectedFriendForList} onValueChange={setSelectedFriendForList}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Select a friend to view their list" />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.length === 0 ? (
                      <SelectItem value="no-friends" disabled>No friends yet</SelectItem>
                    ) : (
                      friends.map((friend) => {
                        const friendId = friend.user_id === currentUserId ? friend.friend_id : friend.user_id;
                        return (
                          <SelectItem key={friend.id} value={friendId}>
                            {friend.friend_name || "Friend"}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedFriendForList && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder="Search anime..."
                        value={friendSearchQuery}
                        onChange={(e) => setFriendSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={friendStatusFilter} onValueChange={setFriendStatusFilter}>
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
                    <Select value={friendHentaiFilter} onValueChange={setFriendHentaiFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Hentai filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="show">Show All</SelectItem>
                        <SelectItem value="hide">Hide Hentai</SelectItem>
                        <SelectItem value="only">Hentai Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={friendRankingFilter} onValueChange={setFriendRankingFilter}>
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

                  {/* Anime List */}
                  {filteredFriendAnimeList.length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                      <div className="text-8xl opacity-20">📺</div>
                      <h2 className="text-2xl font-bold text-foreground">No anime found</h2>
                      <p className="text-muted-foreground">
                        {friendSearchQuery || friendStatusFilter !== "all" || friendHentaiFilter !== "show" || friendRankingFilter !== "all"
                          ? "Try adjusting your filters"
                          : "This friend hasn't added any anime yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 animate-fade-in">
                      {Object.entries(groupedFriendAnime).map(([title, seasons]) => (
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
                          onEdit={() => {}} // Disable edit for friend's anime
                          onDelete={() => {}} // Disable delete for friend's anime
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Friends List */}
              <div className="mt-6">
                <h3 className="font-semibold mb-4">My Friends</h3>
                {friends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No friends yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {friends.map((friend) => {
                      const friendId = friend.user_id === currentUserId ? friend.friend_id : friend.user_id;
                      return (
                        <Card key={friend.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedFriendId(friendId)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                                  {friend.friend_name?.charAt(0).toUpperCase() || friend.friend_email?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div>
                                  <p className="font-semibold">{friend.friend_name || "Friend"}</p>
                                  {friend.friend_email && (
                                    <p className="text-sm text-muted-foreground">{friend.friend_email}</p>
                                  )}
                                </div>
                              </div>
                              <Button variant="outline" onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFriendId(friendId);
                              }}>
                                View Rankings
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Pending Requests</h3>
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">Friend Request</p>
                              <p className="text-sm text-muted-foreground">User ID: {request.user_id.slice(0, 8)}...</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acceptFriendRequest(request.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectFriendRequest(request.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Sent Requests</h3>
              {sentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sent requests</p>
              ) : (
                <div className="space-y-2">
                  {sentRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <UserSearch className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">Pending</p>
                              <p className="text-sm text-muted-foreground">Waiting for response...</p>
                            </div>
                          </div>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="find" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To add friends, share your User ID with them, or ask for their User ID.
                </p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your User ID:</p>
                  <p className="font-mono text-sm break-all">{currentUserId}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Enter friend's User ID"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    if (searchEmail.trim()) {
                      sendFriendRequestByUserId(searchEmail.trim());
                    } else {
                      toast.error("Please enter a User ID");
                    }
                  }}
                  disabled={isLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Friend Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedFriendId && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Friend's Rankings</h2>
            <Button variant="outline" onClick={() => setSelectedFriendId(null)}>
              Close
            </Button>
          </div>
          <AnimeRanking userId={selectedFriendId} isOwnProfile={false} />
        </div>
      )}
    </div>
  );
};

export default Friends;

