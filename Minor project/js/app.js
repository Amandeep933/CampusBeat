/**
 * ============================================================================
 * SPOTIFY CLONE - MAIN UI CONTROLLER & VIEW ROUTER MODULE
 * ============================================================================
 * File: js/app.js
 * Description: Orchestrates single-page application (SPA) view rendering,
 * sidebar library list, search filtering, playlist details, and event listeners.
 * Working:
 * 1. Listens for DOMContentLoaded and initializes player and views.
 * 2. Manages current view state ('home', 'search', 'library', 'playlist', 'liked').
 * 3. Renders HTML templates dynamically into `#content-body`.
 * 4. Binds click handlers to songs, play buttons, and like toggles.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async function () {
  // ==========================================================================
  // APPLICATION STATE
  // ==========================================================================
  let currentView = 'home';             // Active view route name
  let activePlaylistData = null;        // Data object of currently open playlist view
  let allSongsCatalog = [];             // Cached songs array
  let allPlaylistsCatalog = [];         // Cached playlists array

  // ==========================================================================
  // DOM ELEMENT REFERENCES
  // ==========================================================================
  const contentBody = document.getElementById('content-body');
  const searchHeaderContainer = document.getElementById('header-search-container');
  const searchInput = document.getElementById('search-input');
  const sidebarLibraryList = document.getElementById('sidebar-library-list');

  const navHome = document.getElementById('nav-home');
  const navSearch = document.getElementById('nav-search');
  const navLibrary = document.getElementById('nav-library');
  const navBrand = document.getElementById('nav-brand');
  const btnCreatePlaylist = document.getElementById('btn-create-playlist');
  const btnNavBack = document.getElementById('btn-nav-back');
  const btnNavForward = document.getElementById('btn-nav-forward');

  // ==========================================================================
  // 1. INITIALIZATION & DATA LOADING
  // ==========================================================================
  // Initialize HTML5 Audio Player Engine
  MusicPlayer.init();

  // Initialize Interactive Theme Switcher
  initThemeSwitcher();

  // Fetch initial music catalog and playlists from API
  try {
    allSongsCatalog = await ApiService.getSongs();
    allPlaylistsCatalog = await ApiService.getPlaylists();
  } catch (error) {
    console.error('[App Init] Error fetching initial data:', error);
  }

  // Populate Left Sidebar Library List
  renderSidebarLibrary();

  // Attach Navigation Click Event Listeners
  attachNavEvents();

  // Render Default Initial View (Home)
  navigateTo('home');

  // Listen for custom events dispatched by player
  document.addEventListener('trackChanged', onTrackChanged);
  document.addEventListener('playbackStatusChanged', onPlaybackStatusChanged);
  document.addEventListener('songLikedChanged', onSongLikedChanged);

  // ==========================================================================
  // 2. VIEW ROUTING SYSTEM
  // ==========================================================================

  /**
   * Navigate to a specific view route
   * @param {string} viewName - 'home' | 'search' | 'library' | 'playlist' | 'liked'
   * @param {object} params - Optional payload (e.g. { playlistId: 'playlist-1' })
   */
  async function navigateTo(viewName, params = {}) {
    currentView = viewName;
    updateActiveSidebarNav(viewName);

    // Toggle Top Search Bar Input visibility
    if (searchHeaderContainer) {
      searchHeaderContainer.style.display = (viewName === 'search') ? 'block' : 'none';
    }

    // Clear content body container
    contentBody.innerHTML = '';

    // Scroll main view port back to top
    document.getElementById('main-view-container').scrollTop = 0;

    // Render corresponding view layout
    switch (viewName) {
      case 'home':
        await renderHomeView();
        break;

      case 'search':
        await renderSearchView();
        break;

      case 'library':
        await renderLibraryView();
        break;

      case 'playlist':
        if (params.playlistId) {
          await renderPlaylistDetailView(params.playlistId);
        }
        break;

      case 'liked':
        await renderLikedSongsView();
        break;

      default:
        await renderHomeView();
        break;
    }
  }

  /**
   * Highlight active item in sidebar navigation menu
   */
  function updateActiveSidebarNav(viewName) {
    [navHome, navSearch, navLibrary].forEach(el => el.classList.remove('active'));
    if (viewName === 'home') navHome.classList.add('active');
    if (viewName === 'search') navSearch.classList.add('active');
    if (viewName === 'library') navLibrary.classList.add('active');
  }

  /**
   * Bind event listeners to sidebar menu items and header navigation buttons
   */
  function attachNavEvents() {
    navBrand.addEventListener('click', () => navigateTo('home'));
    navHome.addEventListener('click', () => navigateTo('home'));
    navSearch.addEventListener('click', () => {
      navigateTo('search');
      setTimeout(() => searchInput && searchInput.focus(), 100);
    });
    navLibrary.addEventListener('click', () => navigateTo('library'));
    btnCreatePlaylist.addEventListener('click', () => navigateTo('liked'));

    // Back / Forward Buttons
    btnNavBack.addEventListener('click', () => window.history.back());
    btnNavForward.addEventListener('click', () => window.history.forward());

    // Search Input Real-Time Keyboard Listener
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', function (e) {
        clearTimeout(debounceTimer);
        const query = e.target.value;
        debounceTimer = setTimeout(() => {
          if (currentView === 'search') {
            performSearch(query);
          }
        }, 300);
      });
    }
  }

  // ==========================================================================
  // 3. SIDEBAR LIBRARY RENDERER
  // ==========================================================================
  /**
   * Render playlist items inside left sidebar library box
   */
  function renderSidebarLibrary() {
    sidebarLibraryList.innerHTML = '';

    // Liked Songs Quick Entry Item
    const likedItem = document.createElement('div');
    likedItem.className = 'library-item';
    likedItem.innerHTML = `
      <img src="https://misc.scdn.co/liked-songs/liked-songs-640.png" alt="Liked Songs" class="library-item-img">
      <div class="library-item-info">
        <h4>Liked Songs</h4>
        <p><i class="fa-solid fa-thumbtack" style="color:#1db954"></i> Playlist</p>
      </div>
    `;
    likedItem.addEventListener('click', () => navigateTo('liked'));
    sidebarLibraryList.appendChild(likedItem);

    // Dynamic Curated Playlists Items
    allPlaylistsCatalog.forEach(playlist => {
      const item = document.createElement('div');
      item.className = 'library-item';
      item.innerHTML = `
        <img src="${playlist.cover}" alt="${playlist.title}" class="library-item-img">
        <div class="library-item-info">
          <h4>${escapeHTML(playlist.title)}</h4>
          <p>Playlist • Spotify</p>
        </div>
      `;
      item.addEventListener('click', () => navigateTo('playlist', { playlistId: playlist.id }));
      sidebarLibraryList.appendChild(item);
    });
  }

  // ==========================================================================
  // 4. HOME VIEW RENDERER
  // ==========================================================================
  /**
   * Render Spotify Home View (Greetings, Made For You, Popular Songs)
   */
  async function renderHomeView() {
    // Dynamic Time Greeting (Good Morning / Afternoon / Evening)
    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    const container = document.createElement('div');
    container.innerHTML = `
      <h2 class="section-title">${greeting}</h2>
      
      <!-- Made For You Playlists Grid -->
      <div class="cards-grid" id="home-playlists-grid"></div>

      <h2 class="section-title">Popular Songs</h2>
      
      <!-- Songs Grid Cards -->
      <div class="cards-grid" id="home-songs-grid"></div>
    `;

    contentBody.appendChild(container);

    // Populate Playlists Cards Grid
    const playlistsGrid = document.getElementById('home-playlists-grid');
    allPlaylistsCatalog.forEach(playlist => {
      const card = createMusicCard({
        title: playlist.title,
        subtitle: playlist.description,
        cover: playlist.cover,
        onCardClick: () => navigateTo('playlist', { playlistId: playlist.id }),
        onPlayClick: (e) => {
          e.stopPropagation();
          MusicPlayer.loadQueue(playlist.songs, 0);
        }
      });
      playlistsGrid.appendChild(card);
    });

    // Populate Songs Cards Grid
    const songsGrid = document.getElementById('home-songs-grid');
    allSongsCatalog.forEach((song, index) => {
      const card = createMusicCard({
        title: song.title,
        subtitle: `${song.artist} • ${song.genre}`,
        cover: song.cover,
        onCardClick: () => MusicPlayer.loadQueue(allSongsCatalog, index),
        onPlayClick: (e) => {
          e.stopPropagation();
          MusicPlayer.loadQueue(allSongsCatalog, index);
        }
      });
      songsGrid.appendChild(card);
    });
  }

  // ==========================================================================
  // 5. SEARCH VIEW RENDERER
  // ==========================================================================
  /**
   * Render Spotify Search View Layout (Browse Genres Grid & Results Table)
   */
  async function renderSearchView() {
    const container = document.createElement('div');
    container.id = 'search-view-container';
    container.innerHTML = `
      <div id="search-default-state">
        <h2 class="section-title">Browse All Genres</h2>
        <div class="cards-grid" id="genres-grid"></div>
      </div>
      <div id="search-results-state" style="display:none;">
        <h2 class="section-title">Search Results</h2>
        <div id="search-results-content"></div>
      </div>
    `;

    contentBody.appendChild(container);

    // Populate Genre Category Cards
    const genres = [
      { name: "Pop", color: "#8d67ab", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80" },
      { name: "Hip-Hop", color: "#ba5d07", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80" },
      { name: "Rock", color: "#e61e32", cover: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80" },
      { name: "Synthwave", color: "#e8115b", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80" },
      { name: "Electronic", color: "#1e3264", cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80" },
      { name: "Jazz", color: "#dc148c", cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80" }
    ];

    const genresGrid = document.getElementById('genres-grid');
    genres.forEach(genre => {
      const card = document.createElement('div');
      card.className = 'music-card';
      card.style.backgroundColor = genre.color;
      card.innerHTML = `
        <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 20px;">${genre.name}</h3>
        <div class="card-img-wrapper">
          <img src="${genre.cover}" alt="${genre.name}" class="card-img">
        </div>
      `;
      card.addEventListener('click', () => {
        if (searchInput) searchInput.value = genre.name;
        performSearch(genre.name);
      });
      genresGrid.appendChild(card);
    });

    // If search bar already has text, execute search immediately
    if (searchInput && searchInput.value.trim() !== '') {
      performSearch(searchInput.value);
    }
  }

  /**
   * Execute search and render results
   * @param {string} query 
   */
  async function performSearch(query) {
    const defaultState = document.getElementById('search-default-state');
    const resultsState = document.getElementById('search-results-state');
    const resultsContent = document.getElementById('search-results-content');

    if (!query.trim()) {
      if (defaultState) defaultState.style.display = 'block';
      if (resultsState) resultsState.style.display = 'none';
      return;
    }

    if (defaultState) defaultState.style.display = 'none';
    if (resultsState) resultsState.style.display = 'block';

    const matchingSongs = await ApiService.search(query);

    if (matchingSongs.length === 0) {
      resultsContent.innerHTML = `<p style="color:var(--text-subtext); margin-top:16px;">No songs found matching "${escapeHTML(query)}"</p>`;
    } else {
      resultsContent.innerHTML = '';
      const table = renderSongsTable(matchingSongs);
      resultsContent.appendChild(table);
    }
  }

  // ==========================================================================
  // 6. LIBRARY & PLAYLIST DETAIL VIEW RENDERERS
  // ==========================================================================
  /**
   * Render Library View Grid
   */
  async function renderLibraryView() {
    const container = document.createElement('div');
    container.innerHTML = `
      <h2 class="section-title">Your Playlists & Collections</h2>
      <div class="cards-grid" id="library-cards-grid"></div>
    `;

    contentBody.appendChild(container);
    const grid = document.getElementById('library-cards-grid');

    // Liked Songs Card
    const likedSongs = allSongsCatalog.filter(s => s.liked);
    const likedCard = createMusicCard({
      title: "Liked Songs",
      subtitle: `${likedSongs.length} songs`,
      cover: "https://misc.scdn.co/liked-songs/liked-songs-640.png",
      onCardClick: () => navigateTo('liked'),
      onPlayClick: (e) => {
        e.stopPropagation();
        if (likedSongs.length > 0) MusicPlayer.loadQueue(likedSongs, 0);
      }
    });
    grid.appendChild(likedCard);

    // Playlists Cards
    allPlaylistsCatalog.forEach(playlist => {
      const card = createMusicCard({
        title: playlist.title,
        subtitle: `${playlist.totalTracks} tracks`,
        cover: playlist.cover,
        onCardClick: () => navigateTo('playlist', { playlistId: playlist.id }),
        onPlayClick: (e) => {
          e.stopPropagation();
          MusicPlayer.loadQueue(playlist.songs, 0);
        }
      });
      grid.appendChild(card);
    });
  }

  /**
   * Render Playlist Detail View (Header banner + Songs Table)
   * @param {string} playlistId 
   */
  async function renderPlaylistDetailView(playlistId) {
    const playlist = await ApiService.getPlaylistById(playlistId);
    activePlaylistData = playlist;

    const container = document.createElement('div');
    container.innerHTML = `
      <!-- Playlist Header Banner -->
      <div class="playlist-header-container">
        <img src="${playlist.cover}" alt="${escapeHTML(playlist.title)}" class="playlist-big-cover">
        <div class="playlist-info-meta">
          <span>Playlist</span>
          <h1>${escapeHTML(playlist.title)}</h1>
          <p>${escapeHTML(playlist.description)} • <strong>${playlist.totalTracks} songs</strong></p>
          
          <button class="card-play-btn" style="position:static; opacity:1; transform:none; margin-top:16px;" id="btn-play-playlist">
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
      </div>

      <!-- Songs Listing Table -->
      <div id="playlist-songs-container"></div>
    `;

    contentBody.appendChild(container);

    const songsContainer = document.getElementById('playlist-songs-container');
    const table = renderSongsTable(playlist.songs);
    songsContainer.appendChild(table);

    // Play All Playlist Button Handler
    const btnPlay = document.getElementById('btn-play-playlist');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (playlist.songs && playlist.songs.length > 0) {
          MusicPlayer.loadQueue(playlist.songs, 0);
        }
      });
    }
  }

  /**
   * Render Liked Songs Special View
   */
  async function renderLikedSongsView() {
    const songs = await ApiService.getSongs();
    const likedSongs = songs.filter(s => s.liked);

    const container = document.createElement('div');
    container.innerHTML = `
      <!-- Liked Songs Header -->
      <div class="playlist-header-container" style="background: linear-gradient(to bottom, rgba(80, 56, 160, 0.6), transparent);">
        <img src="https://misc.scdn.co/liked-songs/liked-songs-640.png" alt="Liked Songs" class="playlist-big-cover">
        <div class="playlist-info-meta">
          <span>Playlist</span>
          <h1>Liked Songs</h1>
          <p>Your favorite saved tracks • <strong>${likedSongs.length} songs</strong></p>

          <button class="card-play-btn" style="position:static; opacity:1; transform:none; margin-top:16px;" id="btn-play-liked">
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
      </div>

      <!-- Songs Table -->
      <div id="liked-songs-container"></div>
    `;

    contentBody.appendChild(container);

    const containerDiv = document.getElementById('liked-songs-container');
    if (likedSongs.length === 0) {
      containerDiv.innerHTML = `<p style="color:var(--text-subtext); margin-top:24px;">You haven't liked any songs yet. Click the heart icon on any song to save it here!</p>`;
    } else {
      const table = renderSongsTable(likedSongs);
      containerDiv.appendChild(table);

      const btnPlay = document.getElementById('btn-play-liked');
      if (btnPlay) {
        btnPlay.addEventListener('click', () => {
          MusicPlayer.loadQueue(likedSongs, 0);
        });
      }
    }
  }

  // ==========================================================================
  // 7. UI COMPONENT GENERATORS & HELPER FUNCTIONS
  // ==========================================================================

  /**
   * Create standard Spotify Music Card HTML element
   */
  function createMusicCard({ title, subtitle, cover, onCardClick, onPlayClick }) {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${cover}" alt="${escapeHTML(title)}" class="card-img">
        <button class="card-play-btn" title="Play">
          <i class="fa-solid fa-play"></i>
        </button>
      </div>
      <h3 class="card-title">${escapeHTML(title)}</h3>
      <p class="card-subtitle">${escapeHTML(subtitle)}</p>
    `;

    card.addEventListener('click', onCardClick);
    const playBtn = card.querySelector('.card-play-btn');
    if (playBtn && onPlayClick) {
      playBtn.addEventListener('click', onPlayClick);
    }

    return card;
  }

  /**
   * Create reusable Songs Table Component (#, Title, Album, Heart, Duration)
   * @param {Array} songList - Array of song objects
   */
  function renderSongsTable(songList) {
    const table = document.createElement('table');
    table.className = 'songs-table';

    table.innerHTML = `
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Title</th>
          <th>Album</th>
          <th style="width: 50px; text-align: center;"><i class="fa-regular fa-heart"></i></th>
          <th style="width: 80px; text-align: right;"><i class="fa-regular fa-clock"></i></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    const currentSong = MusicPlayer.getCurrentSong();

    songList.forEach((song, index) => {
      const row = document.createElement('tr');
      row.className = 'song-row';
      row.dataset.songId = song.id;

      // Check if song is currently active
      if (currentSong && currentSong.id === song.id) {
        row.classList.add('playing');
      }

      row.innerHTML = `
        <td style="text-align: center;" class="row-number">${index + 1}</td>
        <td>
          <div class="song-title-cell">
            <img src="${song.cover}" alt="${escapeHTML(song.title)}" class="song-thumb">
            <div class="song-details">
              <h4>${escapeHTML(song.title)}</h4>
              <p>${escapeHTML(song.artist)}</p>
            </div>
          </div>
        </td>
        <td>${escapeHTML(song.album || 'Single')}</td>
        <td style="text-align: center;">
          <button class="song-like-btn" title="Like Song">
            <i class="${song.liked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'}"></i>
          </button>
        </td>
        <td style="text-align: right;">${song.duration}</td>
      `;

      // Row Click Event: Play song from this table queue
      row.addEventListener('click', (e) => {
        // Prevent row play trigger if like heart button was clicked
        if (e.target.closest('.song-like-btn')) return;
        MusicPlayer.loadQueue(songList, index);
      });

      // Like Button Click Event inside row
      const likeBtn = row.querySelector('.song-like-btn');
      likeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newStatus = await ApiService.toggleLikeSong(song.id);
        song.liked = newStatus;
        likeBtn.innerHTML = newStatus 
          ? '<i class="fa-solid fa-heart liked"></i>' 
          : '<i class="fa-regular fa-heart"></i>';

        // Refresh player bottom bar if current track was liked
        const playingSong = MusicPlayer.getCurrentSong();
        if (playingSong && playingSong.id === song.id) {
          playingSong.liked = newStatus;
          const playerLikeBtn = document.getElementById('player-like-btn');
          if (playerLikeBtn) {
            playerLikeBtn.innerHTML = newStatus 
              ? '<i class="fa-solid fa-heart liked"></i>' 
              : '<i class="fa-regular fa-heart"></i>';
          }
        }
      });

      tbody.appendChild(row);
    });

    return table;
  }

  // ==========================================================================
  // 8. PLAYER EVENT LISTENERS (SYNC UI STATES)
  // ==========================================================================
  function onTrackChanged(e) {
    const { songId } = e.detail;
    highlightPlayingRow(songId);
  }

  function onPlaybackStatusChanged(e) {
    const { songId } = e.detail;
    highlightPlayingRow(songId);
  }

  function onSongLikedChanged(e) {
    const { songId, liked } = e.detail;
    // Update matching song row heart icon if visible
    const row = document.querySelector(`.song-row[data-song-id="${songId}"]`);
    if (row) {
      const likeBtn = row.querySelector('.song-like-btn');
      if (likeBtn) {
        likeBtn.innerHTML = liked 
          ? '<i class="fa-solid fa-heart liked"></i>' 
          : '<i class="fa-regular fa-heart"></i>';
      }
    }
  }

  /**
   * Highlight active track row in open song table
   */
  function highlightPlayingRow(songId) {
    document.querySelectorAll('.song-row').forEach(row => {
      if (row.dataset.songId === songId) {
        row.classList.add('playing');
      } else {
        row.classList.remove('playing');
      }
    });
  }

  /**
   * Helper: Escape HTML strings to prevent XSS injection
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ==========================================================================
  // 9. THEME SWITCHER CONTROLLER
  // ==========================================================================
  /**
   * Initializes the dynamic theme selector
   * 1. Reads saved theme from browser localStorage (defaults to 'cyberpunk')
   * 2. Sets data-theme attribute on <html> root element to apply CSS variables
   * 3. Handles dropdown toggle, option selection, and outside click dismissal
   */
  function initThemeSwitcher() {
    const themeBtn = document.getElementById('btn-theme-toggle');
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeLabel = document.getElementById('current-theme-label');
    const themeOptions = document.querySelectorAll('.theme-option');

    if (!themeBtn || !themeDropdown) return;

    // Load saved theme preference (defaulting to cyberpunk which matches your logo)
    const savedTheme = localStorage.getItem('campusbeat_theme') || 'cyberpunk';
    applyTheme(savedTheme);

    // Toggle dropdown menu visibility on button click
    themeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      themeDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking anywhere outside of it
    document.addEventListener('click', function (e) {
      if (!themeDropdown.contains(e.target) && e.target !== themeBtn) {
        themeDropdown.classList.remove('show');
      }
    });

    // Handle clicking any theme option
    themeOptions.forEach(option => {
      option.addEventListener('click', function () {
        const selectedTheme = this.dataset.theme;
        applyTheme(selectedTheme);
        localStorage.setItem('campusbeat_theme', selectedTheme);
        themeDropdown.classList.remove('show');
      });
    });

    /**
     * Applies the chosen theme to the DOM and highlights the active option
     * @param {string} themeName 
     */
    function applyTheme(themeName) {
      // Sets <html data-theme="..."> which dynamically swaps CSS variables
      document.documentElement.setAttribute('data-theme', themeName);

      // Update active check state on options list
      themeOptions.forEach(opt => {
        if (opt.dataset.theme === themeName) {
          opt.classList.add('active');
          const title = opt.querySelector('strong');
          if (themeLabel && title) {
            themeLabel.textContent = title.textContent;
          }
        } else {
          opt.classList.remove('active');
        }
      });
    }
  }
});
