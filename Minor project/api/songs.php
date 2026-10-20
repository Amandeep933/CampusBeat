<?php
/**
 * ============================================================================
 * SPOTIFY CLONE - API: SONGS ENDPOINT
 * ============================================================================
 * File: api/songs.php
 * Description: Fetches and returns the music catalog in JSON format.
 * Working:
 * 1. Sets HTTP response headers for JSON output and CORS cross-origin requests.
 * 2. Reads song data from '../data/songs.json'.
 * 3. Handles optional URL query parameters (e.g., ?id=song-1 or ?genre=Pop).
 * 4. Encodes and returns the filtered or complete song collection as JSON.
 * ============================================================================
 */

// Step 1: Set response headers for JSON and enable CORS (Cross-Origin Resource Sharing)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// Path to the JSON data file containing song catalog metadata
$jsonFilePath = __DIR__ . '/../data/songs.json';

// Step 2: Verify if data file exists
if (!file_exists($jsonFilePath)) {
    // Return HTTP 404 error if JSON database file is missing
    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Song database file not found.'
    ]);
    exit;
}

// Step 3: Read raw JSON content from file
$jsonData = file_get_contents($jsonFilePath);

// Decode JSON string into PHP associative array
$songs = json_decode($jsonData, true);

// Check for JSON decoding errors
if ($songs === null) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to parse song data JSON.'
    ]);
    exit;
}

// Step 4: Handle query filtering if parameters are provided in GET request
if (isset($_GET['id'])) {
    // Filter song by single ID
    $targetId = trim($_GET['id']);
    $filtered = array_filter($songs, function($song) use ($targetId) {
        return $song['id'] === $targetId;
    });
    
    // Re-index array values and return single song object or null
    $result = !empty($filtered) ? array_values($filtered)[0] : null;
    echo json_encode(['status' => 'success', 'data' => $result]);
    exit;
}

if (isset($_GET['genre'])) {
    // Filter songs by genre (case-insensitive)
    $targetGenre = strtolower(trim($_GET['genre']));
    $filtered = array_filter($songs, function($song) use ($targetGenre) {
        return strtolower($song['genre']) === $targetGenre;
    });
    
    echo json_encode(['status' => 'success', 'data' => array_values($filtered)]);
    exit;
}

// Step 5: Default behavior - Return full catalog array
echo json_encode([
    'status' => 'success',
    'total' => count($songs),
    'data' => $songs
]);
?>
