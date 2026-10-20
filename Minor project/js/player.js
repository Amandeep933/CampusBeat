/**
 * ============================================================================
 * SPOTIFY CLONE - AUDIO PLAYER ENGINE MODULE
 * ============================================================================
 * File: js/player.js
 * Description: Handles audio playback, controls bar DOM updates, seek bar,
 * volume slider, queue navigation, shuffle mode, and repeat options.
 * Working:
 * 1. Instantiates a single native HTML5 `Audio` instance.
 * 2. Maintains current playlist queue array and active song index.
 * 3. Binds events for `timeupdate`, `ended`, `loadedmetadata`, and `error`.
 * 4. Provides API methods for play, pause, toggle, next, previous, seek, volume.
 * ============================================================================
 */

const MusicPlayer = (function () {
  // ==========================================================================
  // PRIVATE PLAYER STATE VARIABLES
  // ==========================================================================
  const audio = new Audio();           // Native HTML5 Audio instance
  let currentQueue = [];               // Array of song objects in active queue
  let originalQueue = [];              // Backup of queue before shuffle was enabled
  let currentTrackIndex = -1;          // Pointer to active playing track index
  let isPlaying = false;               // Boolean playback status
  let isShuffle = false;               // Boolean shuffle state flag
  let repeatMode = 0;                  // 0 = Off, 1 = Repeat All, 2 = Repeat One

  // ==========================================================================
  // DOM ELEMENT REFERENCES
  // ==========================================================================
  let elPlayBtn, elPrevBtn, elNextBtn, elShuffleBtn, elRepeatBtn;
  let elProgressBar, elProgressFill, elCurrentTime, elDuration;
  let elVolumeBar, elVolumeFill, elVolumeBtn;
  let elCoverImg, elTrackTitle, elArtistName, elLikeBtn;

  /**
   * Initialize and cache DOM elements, attach audio listeners
   */
  function init() {
    // Cache DOM Elements for Player Bottom Bar
    elPlayBtn = document.getElementById('player-play-btn');
    elPrevBtn = document.getElementById('player-prev-btn');
    elNextBtn = document.getElementById('player-next-btn');
    elShuffleBtn = document.getElementById('player-shuffle-btn');
    elRepeatBtn = document.getElementById('player-repeat-btn');

    elProgressBar = document.getElementById('progress-bar');
    elProgressFill = document.getElementById('progress-fill');
    elCurrentTime = document.getElementById('current-time');
    elDuration = document.getElementById('duration-time');

    elVolumeBar = document.getElementById('volume-bar');
    elVolumeFill = document.getElementById('volume-fill');
    elVolumeBtn = document.getElementById('volume-btn');

    elCoverImg = document.getElementById('player-cover');
    elTrackTitle = document.getElementById('player-title');
    elArtistName = document.getElementById('player-artist');
    elLikeBtn = document.getElementById('player-like-btn');

    // Attach HTML5 Audio Native Event Listeners
    attachAudioListeners();

    // Attach UI Controls Event Listeners
    attachUIListeners();

    // Set initial default volume (70%)
    setVolume(0.7);
  }

  /**
   * Bind event handlers to native HTML5 Audio object
   */
  function attachAudioListeners() {
    // Event: Audio time updates continuously while playing
    audio.addEventListener('timeupdate', function () {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        const percent = (audio.currentTime / audio.duration) * 100;
        if (elProgressFill) elProgressFill.style.width = percent + '%';
        if (elCurrentTime) elCurrentTime.textContent = formatTime(audio.currentTime);
      }
    });

    // Event: Song metadata (duration) loaded
    audio.addEventListener('loadedmetadata', function () {
      if (elDuration) elDuration.textContent = formatTime(audio.duration);
    });

    // Event: Track playback completed naturally
    audio.addEventListener('ended', function () {
      if (repeatMode === 2) {
        // Repeat One track
        audio.currentTime = 0;
        audio.play();
      } else {
        // Play Next Track
        nextTrack(true); // true indicates auto-advance
      }
    });

    // Event: Audio playback error handling
    audio.addEventListener('error', function (e) {
      console.warn('[Audio Player] Stream loading error or CORS restriction:', e);
      // Advance to next song after short delay if audio stream is blocked
      setTimeout(() => {
        if (isPlaying) nextTrack(true);
      }, 1500);
    });
  }

  /**
   * Bind event handlers to bottom player bar controls (buttons, sliders)
   */
  function attachUIListeners() {
    // Play/Pause Button Toggle
    if (elPlayBtn) {
      elPlayBtn.addEventListener('click', togglePlayPause);
    }

    // Previous Track Button
    if (elPrevBtn) {
      elPrevBtn.addEventListener('click', () => prevTrack());
    }

    // Next Track Button
    if (elNextBtn) {
      elNextBtn.addEventListener('click', () => nextTrack(false));
    }

    // Shuffle Mode Toggle
    if (elShuffleBtn) {
      elShuffleBtn.addEventListener('click', toggleShuffle);
    }

    // Repeat Mode Toggle
    if (elRepeatBtn) {
      elRepeatBtn.addEventListener('click', toggleRepeat);
    }

    // Progress Bar Seek Event (Click to jump time)
    if (elProgressBar) {
      elProgressBar.addEventListener('click', function (e) {
        const rect = elProgressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const duration = audio.duration;

        if (duration && !isNaN(duration)) {
          const newTime = (clickX / width) * duration;
          audio.currentTime = newTime;
          elProgressFill.style.width = (clickX / width * 100) + '%';
        }
      });
    }

    // Volume Bar Click Event
    if (elVolumeBar) {
      elVolumeBar.addEventListener('click', function (e) {
        const rect = elVolumeBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const newVol = Math.max(0, Math.min(1, clickX / width));
        setVolume(newVol);
      });
    }

    // Mute / Unmute Volume Toggle Button
    if (elVolumeBtn) {
      elVolumeBtn.addEventListener('click', function () {
        if (audio.volume > 0) {
          audio.dataset.prevVolume = audio.volume;
          setVolume(0);
        } else {
          const restoredVol = parseFloat(audio.dataset.prevVolume) || 0.7;
          setVolume(restoredVol);
        }
      });
    }

    // Player Bottom Bar Like Track Button
    if (elLikeBtn) {
      elLikeBtn.addEventListener('click', async function () {
        const currentSong = getCurrentSong();
        if (currentSong) {
          const newStatus = await ApiService.toggleLikeSong(currentSong.id);
          currentSong.liked = newStatus;
          updateLikeButtonUI(newStatus);
          // Dispatch custom event to refresh UI views
          document.dispatchEvent(new CustomEvent('songLikedChanged', { detail: { songId: currentSong.id, liked: newStatus } }));
        }
      });
    }
  }

  // ==========================================================================
  // PLAYBACK CONTROL FUNCTIONS
  // ==========================================================================

  /**
   * Load and play a given queue and track index
   * @param {Array} songList - List of song objects
   * @param {number} startIndex - Index to start playing from
   */
  function loadQueue(songList, startIndex = 0) {
    if (!songList || songList.length === 0) return;

    originalQueue = [...songList];
    
    if (isShuffle) {
      // Create shuffled queue keeping selected track first
      const selectedTrack = songList[startIndex];
      const remainingTracks = songList.filter((_, i) => i !== startIndex);
      shuffleArray(remainingTracks);
      currentQueue = [selectedTrack, ...remainingTracks];
      currentTrackIndex = 0;
    } else {
      currentQueue = [...songList];
      currentTrackIndex = startIndex;
    }

    playCurrentTrack();
  }

  /**
   * Plays the song at currentTrackIndex
   */
  function playCurrentTrack() {
    if (currentTrackIndex < 0 || currentTrackIndex >= currentQueue.length) return;

    const track = currentQueue[currentTrackIndex];
    audio.src = track.url;
    audio.currentTime = 0;

    // Play Audio
    audio.play()
      .then(() => {
        isPlaying = true;
        updatePlayerUI(track);
      })
      .catch(err => {
        console.warn('[Player] Audio auto-play restricted or source error:', err);
        isPlaying = false;
        updatePlayerUI(track);
      });
  }

  /**
   * Toggle between Play and Pause states
   */
  function togglePlayPause() {
    if (!audio.src || currentTrackIndex === -1) {
      // If no track selected, load entire songs catalog
      ApiService.getSongs().then(songs => {
        if (songs.length > 0) loadQueue(songs, 0);
      });
      return;
    }

    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      audio.play();
      isPlaying = true;
    }
    updatePlayPauseButtonUI();
  }

  /**
   * Play Next Track in queue
   * @param {boolean} isAuto - True if triggered automatically on song end
   */
  function nextTrack(isAuto = false) {
    if (currentQueue.length === 0) return;

    if (currentTrackIndex < currentQueue.length - 1) {
      currentTrackIndex++;
      playCurrentTrack();
    } else {
      if (repeatMode === 1 || isAuto) {
        // Loop back to first song if Repeat All is active
        currentTrackIndex = 0;
        playCurrentTrack();
      } else {
        // Pause at end of queue
        isPlaying = false;
        updatePlayPauseButtonUI();
      }
    }
  }

  /**
   * Play Previous Track in queue
   */
  function prevTrack() {
    if (currentQueue.length === 0) return;

    // If song played for more than 3 seconds, restart current track
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (currentTrackIndex > 0) {
      currentTrackIndex--;
      playCurrentTrack();
    } else {
      currentTrackIndex = currentQueue.length - 1;
      playCurrentTrack();
    }
  }

  /**
   * Toggle Shuffle state (On/Off)
   */
  function toggleShuffle() {
    isShuffle = !isShuffle;
    if (elShuffleBtn) {
      elShuffleBtn.classList.toggle('active', isShuffle);
    }

    const currentSong = getCurrentSong();
    if (isShuffle) {
      // Enable shuffle: randomize queue
      if (currentSong) {
        const remaining = originalQueue.filter(s => s.id !== currentSong.id);
        shuffleArray(remaining);
        currentQueue = [currentSong, ...remaining];
        currentTrackIndex = 0;
      }
    } else {
      // Restore original non-shuffled queue order
      currentQueue = [...originalQueue];
      if (currentSong) {
        currentTrackIndex = currentQueue.findIndex(s => s.id === currentSong.id);
      }
    }
  }

  /**
   * Toggle Repeat modes (0 = Off, 1 = Repeat All, 2 = Repeat One)
   */
  function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    if (elRepeatBtn) {
      elRepeatBtn.classList.toggle('active', repeatMode > 0);
      elRepeatBtn.innerHTML = repeatMode === 2 
        ? '<i class="fa-solid fa-repeat"></i><span class="repeat-badge">1</span>' 
        : '<i class="fa-solid fa-repeat"></i>';
    }
  }

  /**
   * Set volume level (0.0 to 1.0)
   */
  function setVolume(val) {
    audio.volume = val;
    if (elVolumeFill) elVolumeFill.style.width = (val * 100) + '%';
    if (elVolumeBtn) {
      if (val === 0) {
        elVolumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      } else if (val < 0.5) {
        elVolumeBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
      } else {
        elVolumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      }
    }
  }

  // ==========================================================================
  // UI UPDATE UTILITIES
  // ==========================================================================

  /**
   * Update all player bar elements with active track details
   */
  function updatePlayerUI(track) {
    if (elCoverImg) elCoverImg.src = track.cover;
    if (elTrackTitle) elTrackTitle.textContent = track.title;
    if (elArtistName) elArtistName.textContent = track.artist;
    updateLikeButtonUI(track.liked);
    updatePlayPauseButtonUI();

    // Dispatch custom event so app.js can highlight active row in song lists
    document.dispatchEvent(new CustomEvent('trackChanged', { detail: { songId: track.id, isPlaying } }));
  }

  /**
   * Toggle play/pause icon in bottom bar button
   */
  function updatePlayPauseButtonUI() {
    if (elPlayBtn) {
      elPlayBtn.innerHTML = isPlaying 
        ? '<i class="fa-solid fa-circle-pause"></i>' 
        : '<i class="fa-solid fa-circle-play"></i>';
    }
    // Update active highlight in song table rows
    const currentSong = getCurrentSong();
    if (currentSong) {
      document.dispatchEvent(new CustomEvent('playbackStatusChanged', { detail: { songId: currentSong.id, isPlaying } }));
    }
  }

  /**
   * Toggle heart color icon in bottom player bar
   */
  function updateLikeButtonUI(isLiked) {
    if (elLikeBtn) {
      elLikeBtn.innerHTML = isLiked 
        ? '<i class="fa-solid fa-heart liked"></i>' 
        : '<i class="fa-regular fa-heart"></i>';
    }
  }

  /**
   * Utility: Format seconds into MM:SS format string
   */
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  /**
   * Utility: In-place array shuffle (Fisher-Yates)
   */
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ==========================================================================
  // PUBLIC ACCESSORS
  // ==========================================================================
  return {
    init,
    loadQueue,
    togglePlayPause,
    nextTrack,
    prevTrack,
    getCurrentSong: () => currentQueue[currentTrackIndex] || null,
    getIsPlaying: () => isPlaying,
    setVolume
  };
})();
