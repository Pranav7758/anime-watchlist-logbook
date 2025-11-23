import { supabase } from "@/integrations/supabase/client";

interface AnimeUpdate {
  animeId: string;
  animeTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  type: 'episode_release' | 'season_release';
}

export const checkAnimeUpdates = async (userId: string) => {
  try {
    // Get all anime with mal_id for this user
    const { data: userAnime, error: fetchError } = await supabase
      .from("anime")
      .select("id, title, mal_id, season_number, total_episodes")
      .eq("user_id", userId)
      .not("mal_id", "is", null);

    if (fetchError || !userAnime) {
      console.error("Error fetching anime:", fetchError);
      return;
    }

    // Group by title to get unique anime series
    const animeByTitle = userAnime.reduce((acc, anime) => {
      if (!acc[anime.title]) {
        acc[anime.title] = [];
      }
      acc[anime.title].push(anime);
      return acc;
    }, {} as Record<string, typeof userAnime>);

    const updates: AnimeUpdate[] = [];
    const newSeasons: Array<{
      user_id: string;
      title: string;
      mal_id: number;
      season_number: number;
      total_episodes: number | null;
      episodes_watched: number;
      status: string;
      cover_image: string | null;
      notes: string | null;
      rating: number | null;
    }> = [];

    // Check each unique anime series
    for (const [title, seasons] of Object.entries(animeByTitle)) {
      // Get the first season's mal_id (they should all have the same base mal_id)
      const firstSeason = seasons[0];
      if (!firstSeason.mal_id) continue;

      try {
        // Fetch current anime details from Jikan
        const response = await fetch(`https://api.jikan.moe/v4/anime/${firstSeason.mal_id}/full`);
        const data = await response.json();
        
        if (!data.data) continue;

        const currentAnime = data.data;
        
        // Check for new episodes in existing seasons
        for (const season of seasons) {
          if (season.mal_id && season.total_episodes) {
            // Fetch the specific season's details
            const seasonResponse = await fetch(`https://api.jikan.moe/v4/anime/${season.mal_id}`);
            const seasonData = await seasonResponse.json();
            
            if (seasonData.data && seasonData.data.episodes) {
              const newTotalEpisodes = seasonData.data.episodes;
              
              // Check if total episodes increased (new episode released)
              if (newTotalEpisodes > season.total_episodes) {
                updates.push({
                  animeId: season.id,
                  animeTitle: title,
                  seasonNumber: season.season_number,
                  episodeNumber: newTotalEpisodes,
                  type: 'episode_release',
                });
                
                // Update the total episodes in database
                await supabase
                  .from("anime")
                  .update({ total_episodes: newTotalEpisodes })
                  .eq("id", season.id);
              }
            }
            
            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        // Helper function to check if a title represents a new season vs a part/cour
        const isNewSeason = (entryTitle: string, baseTitle: string): boolean => {
          const lowerTitle = entryTitle.toLowerCase();
          const lowerBase = baseTitle.toLowerCase();
          
          // Check if it's a part or cour (continuation of same season)
          if (lowerTitle.includes('part 2') || lowerTitle.includes('part 3') || 
              lowerTitle.includes('part 4') || lowerTitle.includes('cour 2') ||
              lowerTitle.includes('cour 3') || lowerTitle.includes('2nd cour') ||
              lowerTitle.includes('second cour') || lowerTitle.includes('second part')) {
            return false; // This is a part/cour, not a new season
          }
          
          // Check if it's explicitly a new season
          if (lowerTitle.includes('season 2') || lowerTitle.includes('season 3') ||
              lowerTitle.includes('season 4') || lowerTitle.includes('2nd season') ||
              lowerTitle.includes('3rd season') || lowerTitle.includes('4th season') ||
              lowerTitle.includes('second season') || lowerTitle.includes('third season')) {
            return true; // This is a new season
          }
          
          // If the base title is significantly different, it might be a new season
          const titleDiff = lowerTitle.replace(lowerBase, '').trim();
          if (titleDiff && !titleDiff.match(/^(part|cour|season)\s*\d+$/i)) {
            // If there's a meaningful difference beyond part/cour, might be new season
            return true;
          }
          
          return false; // Default to not a new season if uncertain
        };

        // Check for new seasons by following relations
        if (currentAnime.relations) {
          const sequelRelations = currentAnime.relations.filter((rel: any) => 
            rel.relation === "Sequel" || rel.relation === "Season"
          );

          const existingSeasonNumbers = new Set(seasons.map(s => s.season_number));
          const maxSeasonNumber = Math.max(...seasons.map(s => s.season_number));

          for (const relation of sequelRelations) {
            for (const entry of relation.entry || []) {
              try {
                const entryTitle = entry.name || '';
                
                // Skip movies and OVAs for now (they're not seasons)
                if (entry.type === "Movie" || entry.type === "OVA" || entry.type === "ONA") {
                  continue;
                }
                
                const sequelResponse = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
                const sequelData = await sequelResponse.json();
                
                if (sequelData.data) {
                  // Skip if it's a movie
                  if (sequelData.data.type === "Movie") {
                    continue;
                  }
                  
                  // Check if we already have this mal_id
                  const hasThisSeason = seasons.some(s => s.mal_id === entry.mal_id);
                  
                  if (!hasThisSeason && sequelData.data.episodes) {
                    const sequelTitle = sequelData.data.title_english || sequelData.data.title || entryTitle;
                    
                    // Extract season number from title
                    const extractSeasonNumber = (title: string): number | null => {
                      const lowerTitle = title.toLowerCase();
                      const seasonMatch = lowerTitle.match(/season\s*(\d+)/i) || 
                                         lowerTitle.match(/(\d+)(?:st|nd|rd|th)\s*season/i);
                      return seasonMatch ? parseInt(seasonMatch[1]) : null;
                    };
                    
                    const extractedSeason = extractSeasonNumber(sequelTitle);
                    
                    // Check if this is a new season (not just a part of existing season)
                    // If it has a season number higher than what we have, it's new
                    const isActuallyNewSeason = extractedSeason ? 
                      extractedSeason > maxSeasonNumber : 
                      isNewSeason(sequelTitle, title);
                    
                    if (isActuallyNewSeason) {
                      // Determine the season number
                      const newSeasonNumber = extractedSeason || (maxSeasonNumber + 1);
                      
                      // This looks like a new season
                      updates.push({
                        animeId: firstSeason.id,
                        animeTitle: title,
                        seasonNumber: newSeasonNumber,
                        episodeNumber: 1,
                        type: 'season_release',
                      });

                      // Prepare to add new season
                      // Get cover image from the new season or use the first season's
                      const coverImage = sequelData.data.images?.jpg?.large_image_url || 
                                        sequelData.data.images?.jpg?.image_url || 
                                        (firstSeason as any).cover_image || null;
                      
                      newSeasons.push({
                        user_id: userId,
                        title: title,
                        mal_id: entry.mal_id,
                        season_number: newSeasonNumber,
                        total_episodes: sequelData.data.episodes,
                        episodes_watched: sequelData.data.episodes || 0, // Default to all watched
                        status: 'watching',
                        cover_image: coverImage,
                        notes: null,
                        rating: null,
                      });
                    }
                  }
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
                console.error(`Error checking sequel ${entry.mal_id}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error checking updates for ${title}:`, err);
      }
    }

    // Create notifications for updates
    if (updates.length > 0) {
      const notifications = updates.map(update => ({
        user_id: userId,
        anime_id: update.animeId,
        anime_title: update.animeTitle,
        season_number: update.seasonNumber,
        episode_number: update.episodeNumber,
        notification_type: update.type,
        message: update.type === 'episode_release' 
          ? `${update.animeTitle} Season ${update.seasonNumber} Episode ${update.episodeNumber} has been released!`
          : `${update.animeTitle} Season ${update.seasonNumber} has been released!`,
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // Auto-add new seasons
    if (newSeasons.length > 0) {
      await supabase.from("anime").insert(newSeasons);
    }

    return { updates: updates.length, newSeasons: newSeasons.length };
  } catch (error) {
    console.error("Error checking anime updates:", error);
    return null;
  }
};

