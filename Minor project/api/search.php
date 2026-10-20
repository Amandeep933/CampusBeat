<?php
/**
 * ============================================================================
 * SPOTIFY CLONE - API: SEARCH ENDPOINT
 * ============================================================================
 * File: api/search.php
 * Description: Searches songs and playlists matching user query string.
 * Working:
 * 1. Accepts GET parameter `q` (e.g., api/search.php?q=synthwave).
 * 2. Case-insensitively checks match against song titles, artists, albums, and genres.
 * 3. Returns search results containing matching songs array.
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Extract query parameter
$query = isset($_GET['q']) ? trim(strtolower($_GET['q'])) : '';

if (empty($query)) {
    echo json_encode([
        'status' => 'success',
        'query' => '',
        'data' => []
    ]);
    exit;
}

// Load songs catalog
$jsonFilePath = __DIR__ . '/../data/songs.json';
$songs = file_exists($jsonFilePath) ? json_decode(file_get_contents($jsonFilePath), true) : [];

// Filter songs matching query in title, artist, album, or genre
$matchedSongs = array_values(array_filter($songs, function($song) use ($query) {
    return (
        strpos(strtolower($song['title']), $query) !== false ||
        strpos(strtolower($song['artist']), $query) !== false ||
        strpos(strtolower($song['album']), $query) !== false ||
        strpos(strtolower($song['genre']), $query) !== false
    );
}));

// Output filtered JSON response
echo json_encode([
    'status' => 'success',
    'query' => $query,
    'total' => count($matchedSongs),
    'data' => $matchedSongs
]);
?>
