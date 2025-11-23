import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Check, X, Users, UserSearch } from "lucide-react";
import { toast } from "sonner";
import AnimeRanking from "./AnimeRanking";

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

const Friends = ({ currentUserId }: FriendsProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFriends = async () => {
    try {
      // Get accepted friends (both directions)
      const { data: accepted, error } = await supabase
        .from("friends")
        .select("*")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq("status", "accepted");

      if (error) throw error;

      // Get friend details
      const friendIds = new Set<string>();
      (accepted || []).forEach((f) => {
        if (f.user_id === currentUserId) {
          friendIds.add(f.friend_id);
        } else {
          friendIds.add(f.user_id);
        }
      });

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

      setPendingRequests(pending || []);
      setSentRequests(sent || []);
      setFriends(accepted || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
      toast.error("Failed to load friends");
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [currentUserId]);

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
                            {friend.friend_email?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-semibold">{friend.friend_email || "Friend"}</p>
                            <Badge variant="outline" className="mt-1">Friend</Badge>
                          </div>
                        </div>
                        <Button variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFriendId(friendId);
                        }}>
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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

