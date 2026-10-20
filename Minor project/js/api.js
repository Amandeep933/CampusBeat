/**
 * ============================================================================
 * SPOTIFY CLONE - FRONTEND API SERVICE MODULE
 * ============================================================================
 * File: js/api.js
 * Description: Responsible for communicating with PHP REST API backend.
 * Provides automatic static fallback mock data if the page is loaded directly 
 * as static HTML without an active PHP server!
 * ============================================================================
 */

const ApiService = (function () {
  // Base API path endpoint
  const API_BASE_URL = 'api/';

  /**
   * Static Fallback Songs Data
   * Used seamlessly if fetch request to PHP backend fails (e.g. running statically without server).
   */
  const MOCK_SONGS = [
    {
      id: "song-1",
      title: "Midnight City Lights",
      artist: "Synthwave Collective",
      album: "Neon Dreams",
      duration: "3:45",
      cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      genre: "Synthwave",
      liked: false
    },
    {
      id: "song-2",
      title: "Acoustic Sunset",
      artist: "Willow & Oak",
      album: "Unplugged Sessions",
      duration: "4:12",
      cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      genre: "Acoustic",
      liked: true
    },
    {
      id: "song-3",
      title: "Cyberpunk Highway",
      artist: "Electro Force",
      album: "Future World",
      duration: "5:30",
      cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      genre: "Electronic",
      liked: false
    },
    {
      id: "song-4",
      title: "Chill Hop Beats",
      artist: "Lo-Fi Master",
      album: "Study Night",
      duration: "2:50",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      genre: "Lo-Fi",
      liked: true
    },
    {
      id: "song-5",
      title: "Summer Vibes",
      artist: "Tropica",
      album: "Ocean Breeze",
      duration: "3:15",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      genre: "Pop",
      liked: false
    },
    {
      id: "song-6",
      title: "Deep Space Ambient",
      artist: "Cosmic Voyager",
      album: "Nebula",
      duration: "4:45",
      cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      genre: "Ambient",
      liked: false
    },
    {
      id: "song-7",
      title: "Rock Legends Live",
      artist: "The Thunderbolts",
      album: "Arena Anthems",
      duration: "3:58",
      cover: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      genre: "Rock",
      liked: true
    },
    {
      id: "song-8",
      title: "Smooth Jazz Evening",
      artist: "The Velvet Quartet",
      album: "Midnight Lounge",
      duration: "4:05",
      cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      genre: "Jazz",
      liked: false
    }
  ];

  /**
   * Static Fallback Playlists Data
   */
  const MOCK_PLAYLISTS = [
    {
      id: "playlist-1",
      title: "Today's Top Hits",
      description: "The hottest tracks right now across all genres.",
      cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
      songs: [MOCK_SONGS[0], MOCK_SONGS[1], MOCK_SONGS[4], MOCK_SONGS[6]],
      totalTracks: 4
    },
    {
      id: "playlist-2",
      title: "Synthwave & Cyberpunk",
      description: "Futuristic neon synth pulses and retro beats.",
      cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80",
      songs: [MOCK_SONGS[0], MOCK_SONGS[2], MOCK_SONGS[5]],
      totalTracks: 3
    },
    {
      id: "playlist-3",
      title: "Lo-Fi Chill & Study",
      description: "Relaxing beats to focus, study, and unwind.",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
      songs: [MOCK_SONGS[3], MOCK_SONGS[5], MOCK_SONGS[1]],
      totalTracks: 3
    },
    {
      id: "playlist-4",
      title: "Rock Legends & Anthems",
      description: "High energy rock classics and live arena anthems.",
      cover: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
      songs: [MOCK_SONGS[6], MOCK_SONGS[2], MOCK_SONGS[0]],
      totalTracks: 3
    }
  ];

  // Store local copy of songs to handle likes in static mode
  let localSongs = JSON.parse(JSON.stringify(MOCK_SONGS));

  /**
   * Helper function to fetch data from API with automatic fallback
   * @param {string} endpoint - API route (e.g. 'songs.php')
   * @param {object} fallbackData - Data to return if server request fails
   */
  async function fetchWithFallback(endpoint, fallbackData) {
    try {
      const response = await fetch(API_BASE_URL + endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.status === 'success') {
        return result.data;
      }
      return fallbackData;
    } catch (error) {
      console.log(`[API Service] Serving fallback data for ${endpoint}:`, error.message);
      return fallbackData;
    }
  }

  // Public methods exposed by ApiService
  return {
    /**
     * Get all songs from catalog
     */
    async getSongs() {
      return await fetchWithFallback('songs.php', localSongs);
    },

    /**
     * Get single song by ID
     */
    async getSongById(songId) {
      try {
        const songs = await this.getSongs();
        return songs.find(s => s.id === songId) || null;
      } catch (e) {
        return localSongs.find(s => s.id === songId) || null;
      }
    },

    /**
     * Get all playlists
     */
    async getPlaylists() {
      return await fetchWithFallback('playlists.php', MOCK_PLAYLISTS);
    },

    /**
     * Get single playlist by ID
     */
    async getPlaylistById(playlistId) {
      try {
        const response = await fetch(`${API_BASE_URL}playlists.php?id=${playlistId}`);
        if (response.ok) {
          const res = await response.json();
          if (res.status === 'success') return res.data;
        }
      } catch (e) {}
      return MOCK_PLAYLISTS.find(p => p.id === playlistId) || MOCK_PLAYLISTS[0];
    },

    /**
     * Search songs by query
     * @param {string} query 
     */
    async search(query) {
      if (!query.trim()) return [];
      try {
        const response = await fetch(`${API_BASE_URL}search.php?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const res = await response.json();
          if (res.status === 'success') return res.data;
        }
      } catch (e) {}

      // Fallback client search logic
      const q = query.toLowerCase();
      return localSongs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      );
    },

    /**
     * Toggle liked status of a song
     * @param {string} songId 
     */
    async toggleLikeSong(songId) {
      try {
        const response = await fetch(`${API_BASE_URL}like.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId })
        });
        if (response.ok) {
          const res = await response.json();
          if (res.status === 'success') {
            // Update local cache
            const target = localSongs.find(s => s.id === songId);
            if (target) target.liked = res.liked;
            return res.liked;
          }
        }
      } catch (e) {}

      // Fallback local toggle
      const target = localSongs.find(s => s.id === songId);
      if (target) {
        target.liked = !target.liked;
        return target.liked;
      }
      return false;
    }
  };
})();
