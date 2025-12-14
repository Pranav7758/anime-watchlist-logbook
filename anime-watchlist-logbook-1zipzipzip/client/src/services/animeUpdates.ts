import { apiRequest } from "@/lib/queryClient";

interface AnimeUpdate {
  animeId: string;
  animeTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  type: 'episode_release' | 'season_release';
}

interface AnimeData {
  id: string;
  title: string;
  malId: number | null;
  seasonNumber: number;
  totalEpisodes: number | null;
  coverImage: string | null;
}

export const checkAnimeUpdates = async (userId: string) => {
  try {
    const response = await apiRequest("GET", "/api/anime");
    const userAnime: AnimeData[] = await response.json();
    const animeWithMalId = userAnime.filter(a => a.malId !== null);

    if (!animeWithMalId.length) {
      return { updates: 0, newSeasons: 0 };
    }

    const animeByTitle = animeWithMalId.reduce((acc, anime) => {
      if (!acc[anime.title]) {
        acc[anime.title] = [];
      }
      acc[anime.title].push(anime);
      return acc;
    }, {} as Record<string, AnimeData[]>);

    const updates: AnimeUpdate[] = [];
    const newSeasons: Array<{
      title: string;
      malId: number;
      seasonNumber: number;
      totalEpisodes: number | null;
      episodesWatched: number;
      status: string;
      coverImage: string | null;
      notes: string | null;
      rating: number | null;
    }> = [];

    for (const [title, seasons] of Object.entries(animeByTitle)) {
      const firstSeason = seasons[0];
      if (!firstSeason.malId) continue;

      try {
        const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime/${firstSeason.malId}/full`);
        const data = await jikanResponse.json();
        
        if (!data.data) continue;

        const currentAnime = data.data;
        
        for (const season of seasons) {
          if (season.malId && season.totalEpisodes) {
            const seasonResponse = await fetch(`https://api.jikan.moe/v4/anime/${season.malId}`);
            const seasonData = await seasonResponse.json();
            
            if (seasonData.data && seasonData.data.episodes) {
              const newTotalEpisodes = seasonData.data.episodes;
              
              if (newTotalEpisodes > season.totalEpisodes) {
                updates.push({
                  animeId: season.id,
                  animeTitle: title,
                  seasonNumber: season.seasonNumber,
                  episodeNumber: newTotalEpisodes,
                  type: 'episode_release',
                });
                
                await apiRequest("PATCH", `/api/anime/${season.id}`, {
                  totalEpisodes: newTotalEpisodes
                });
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        const isNewSeason = (entryTitle: string, baseTitle: string): boolean => {
          const lowerTitle = entryTitle.toLowerCase();
          
          if (lowerTitle.includes('part 2') || lowerTitle.includes('part 3') || 
              lowerTitle.includes('part 4') || lowerTitle.includes('cour 2') ||
              lowerTitle.includes('cour 3') || lowerTitle.includes('2nd cour') ||
              lowerTitle.includes('second cour') || lowerTitle.includes('second part')) {
            return false;
          }
          
          if (lowerTitle.includes('season 2') || lowerTitle.includes('season 3') ||
              lowerTitle.includes('season 4') || lowerTitle.includes('2nd season') ||
              lowerTitle.includes('3rd season') || lowerTitle.includes('4th season') ||
              lowerTitle.includes('second season') || lowerTitle.includes('third season')) {
            return true;
          }
          
          return false;
        };

        if (currentAnime.relations) {
          const sequelRelations = currentAnime.relations.filter((rel: any) => 
            rel.relation === "Sequel" || rel.relation === "Season"
          );

          const existingMalIds = new Set(seasons.map(s => s.malId));
          const maxSeasonNumber = Math.max(...seasons.map(s => s.seasonNumber));

          for (const relation of sequelRelations) {
            for (const entry of relation.entry || []) {
              try {
                if (entry.type === "Movie" || entry.type === "OVA" || entry.type === "ONA") {
                  continue;
                }
                
                if (existingMalIds.has(entry.mal_id)) {
                  continue;
                }
                
                const sequelResponse = await fetch(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
                const sequelData = await sequelResponse.json();
                
                if (sequelData.data && sequelData.data.type !== "Movie") {
                  const sequelTitle = sequelData.data.title_english || sequelData.data.title || entry.name;
                  
                  const extractSeasonNumber = (t: string): number | null => {
                    const match = t.toLowerCase().match(/season\s*(\d+)/i) || 
                                 t.toLowerCase().match(/(\d+)(?:st|nd|rd|th)\s*season/i);
                    return match ? parseInt(match[1]) : null;
                  };
                  
                  const extractedSeason = extractSeasonNumber(sequelTitle);
                  const isActuallyNewSeason = extractedSeason ? 
                    extractedSeason > maxSeasonNumber : 
                    isNewSeason(sequelTitle, title);
                  
                  if (isActuallyNewSeason && sequelData.data.episodes) {
                    const newSeasonNumber = extractedSeason || (maxSeasonNumber + 1);
                    
                    updates.push({
                      animeId: firstSeason.id,
                      animeTitle: title,
                      seasonNumber: newSeasonNumber,
                      episodeNumber: 1,
                      type: 'season_release',
                    });

                    const coverImage = sequelData.data.images?.jpg?.large_image_url || 
                                      sequelData.data.images?.jpg?.image_url || 
                                      firstSeason.coverImage || null;
                    
                    newSeasons.push({
                      title: title,
                      malId: entry.mal_id,
                      seasonNumber: newSeasonNumber,
                      totalEpisodes: sequelData.data.episodes,
                      episodesWatched: 0,
                      status: 'watching',
                      coverImage: coverImage,
                      notes: null,
                      rating: null,
                    });
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

    if (updates.length > 0) {
      const notifications = updates.map(update => ({
        animeId: update.animeId,
        animeTitle: update.animeTitle,
        seasonNumber: update.seasonNumber,
        episodeNumber: update.episodeNumber,
        notificationType: update.type,
        message: update.type === 'episode_release' 
          ? `${update.animeTitle} Season ${update.seasonNumber} Episode ${update.episodeNumber} has been released!`
          : `${update.animeTitle} Season ${update.seasonNumber} has been released!`,
      }));

      for (const notification of notifications) {
        await apiRequest("POST", "/api/notifications", notification);
      }
    }

    if (newSeasons.length > 0) {
      await apiRequest("POST", "/api/anime", newSeasons);
    }

    return { updates: updates.length, newSeasons: newSeasons.length };
  } catch (error) {
    console.error("Error checking anime updates:", error);
    return null;
  }
};
