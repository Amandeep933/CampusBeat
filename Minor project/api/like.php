<?php
/**
 * ============================================================================
 * SPOTIFY CLONE - API: LIKE / UNLIKE SONG ENDPOINT
 * ============================================================================
 * File: api/like.php
 * Description: Toggles the "liked" heart status of a song and saves to data/songs.json.
 * Working:
 * 1. Accepts POST request with JSON payload containing `{ "songId": "song-1" }`.
 * 2. Finds the target song in data/songs.json.
 * 3. Inverts the boolean `liked` property.
 * 4. Saves updated songs array back to data/songs.json file.
 * 5. Returns updated song status JSON.
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Read raw JSON body from request
$rawInput = file_get_contents('php://input');
$requestData = json_decode($rawInput, true);

// Fallback to $_POST if form data was sent
$songId = $requestData['songId'] ?? $_POST['songId'] ?? $_GET['songId'] ?? null;

if (!$songId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Song ID is required.']);
    exit;
}

$jsonFilePath = __DIR__ . '/../data/songs.json';
if (!file_exists($jsonFilePath)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Song database file not found.']);
    exit;
}

$songs = json_decode(file_get_contents($jsonFilePath), true);
$updatedSong = null;

// Find and update target song
foreach ($songs as &$song) {
    if ($song['id'] === $songId) {
        $song['liked'] = !($song['liked'] ?? false);
        $updatedSong = $song;
        break;
    }
}

if ($updatedSong) {
    // Write updated array back to data/songs.json
    file_put_contents($jsonFilePath, json_encode($songs, JSON_PRETTY_PRINT));
    echo json_encode([
        'status' => 'success',
        'liked' => $updatedSong['liked'],
        'data' => $updatedSong
    ]);
} else {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Song ID not found in database.']);
}
?>
