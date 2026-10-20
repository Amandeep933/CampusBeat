<?php
/**
 * ============================================================================
 * SPOTIFY CLONE - API: PLAYLISTS ENDPOINT
 * ============================================================================
 * File: api/playlists.php
 * Description: Generates and returns playlist collections (Today's Top Hits,
 * Chill Hits, Rock Classics, Synthwave Essentials, etc.) and user library collections.
 * Working:
 * 1. Reads main song catalog from data/songs.json.
 * 2. Groups songs into curated playlist objects.
 * 3. Returns playlists with track details, cover graphics, and metadata as JSON.
 * ============================================================================
 */

// Step 1: Output JSON content-type header and CORS permissions
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Load base songs catalog
$jsonFilePath = __DIR__ . '/../data/songs.json';
$songs = file_exists($jsonFilePath) ? json_decode(file_get_contents($jsonFilePath), true) : [];

// Step 2: Define curated playlists
$playlists = [
    [
        'id' => 'playlist-1',
        'title' => "Today's Top Hits",
        'description' => 'The hottest tracks right now across all genres.',
        'cover' => 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
        'songIds' => ['song-1', 'song-2', 'song-5', 'song-7']
    ],
    [
        'id' => 'playlist-2',
        'title' => 'Synthwave & Cyberpunk',
        'description' => 'Futuristic neon synth pulses and retro beats.',
        'cover' => 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
        'songIds' => ['song-1', 'song-3', 'song-6']
    ],
    [
        'id' => 'playlist-3',
        'title' => 'Lo-Fi Chill & Study',
        'description' => 'Relaxing beats to focus, study, and unwind.',
        'cover' => 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
        'songIds' => ['song-4', 'song-6', 'song-2']
    ],
    [
        'id' => 'playlist-4',
        'title' => 'Rock Legends & Anthems',
        'description' => 'High energy rock classics and live arena anthems.',
        'cover' => 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
        'songIds' => ['song-7', 'song-3', 'song-1']
    ]
];

// Step 3: Populate playlist object with full song records for matching IDs
foreach ($playlists as &$playlist) {
    $playlistSongs = [];
    foreach ($playlist['songIds'] as $sId) {
        foreach ($songs as $song) {
            if ($song['id'] === $sId) {
                $playlistSongs[] = $song;
                break;
            }
        }
    }
    $playlist['songs'] = $playlistSongs;
    $playlist['totalTracks'] = count($playlistSongs);
}

// Step 4: Handle single playlist query by ID (e.g. ?id=playlist-1)
if (isset($_GET['id'])) {
    $targetId = trim($_GET['id']);
    foreach ($playlists as $p) {
        if ($p['id'] === $targetId) {
            echo json_encode(['status' => 'success', 'data' => $p]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Playlist not found']);
    exit;
}

// Step 5: Output all playlists
echo json_encode([
    'status' => 'success',
    'data' => $playlists
]);
?>
