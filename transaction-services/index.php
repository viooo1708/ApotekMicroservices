<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require "vendor/autoload.php";

use Predis\Client;

// ===================
// REDIS CONNECTION
// ===================
try {
    $redis = new Client([
        "scheme" => "tcp",
        "host"   => "redis-db",
        "port"   => 6379
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Redis connection failed"]);
    exit;
}

// ===================
// HELPERS
// ===================
function getJsonBody()
{
    return json_decode(file_get_contents("php://input"), true);
}

function response($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

$uri = explode("/", trim($_SERVER["REQUEST_URI"], "/"));
$method = $_SERVER["REQUEST_METHOD"];

// ===================
// GET ALL TRANSACTIONS
// ===================
if ($method === "GET" && $uri[0] === "transactions" && count($uri) === 1) {
    $keys = $redis->keys("transaction:*");
    $data = [];

    foreach ($keys as $key) {
        $data[] = json_decode($redis->get($key), true);
    }

    response(["success" => true, "data" => $data]);
}

// ===================
// GET SINGLE TRANSACTION
// ===================
if ($method === "GET" && $uri[0] === "transactions" && isset($uri[1])) {
    $trx = $uri[1];
    $data = $redis->get("transaction:$trx");

    if (!$data) {
        response(["success" => false, "message" => "Transaction not found"], 404);
    }

    response(["success" => true, "data" => json_decode($data, true)]);
}

// ===================
// CREATE TRANSACTION
// ===================
if ($method === "POST" && $uri[0] === "transactions") {
    $body = getJsonBody();

    if (!isset($body["trx"], $body["items"], $body["payment_method"])) {
        response(["success" => false, "message" => "Invalid input"], 400);
    }

    $items = array_map(function ($item) {
        $item["subtotal"] =
            $item["subtotal"] ??
            ((int)($item["qty"] ?? 0) * (int)($item["price"] ?? 0));
        return $item;
    }, $body["items"]);

    $data = [
        "trx" => $body["trx"],
        "items" => $items,
        "payment_method" => $body["payment_method"],
        "note" => $body["note"] ?? "",
        "created_at" => date("c")
    ];

    $redis->set("transaction:{$body['trx']}", json_encode($data));

    response(["success" => true, "message" => "Transaction saved", "data" => $data]);
}

// ===================
// UPDATE TRANSACTION
// ===================
if ($method === "PUT" && $uri[0] === "transactions" && isset($uri[1])) {
    $trx = $uri[1];
    $existing = $redis->get("transaction:$trx");

    if (!$existing) {
        response(["success" => false, "message" => "Transaction not found"], 404);
    }

    $old = json_decode($existing, true);
    $body = getJsonBody();

    if (isset($body["items"])) {
        $old["items"] = array_map(function ($item) {
            $item["subtotal"] =
                $item["subtotal"] ??
                ((int)($item["qty"] ?? 0) * (int)($item["price"] ?? 0));
            return $item;
        }, $body["items"]);
    }

    $old["payment_method"] = $body["payment_method"] ?? $old["payment_method"];
    $old["note"] = $body["note"] ?? $old["note"];

    $redis->set("transaction:$trx", json_encode($old));

    response(["success" => true, "message" => "Transaction updated", "data" => $old]);
}

// ===================
// DELETE TRANSACTION
// ===================
if ($method === "DELETE" && $uri[0] === "transactions" && isset($uri[1])) {
    $trx = $uri[1];
    $deleted = $redis->del(["transaction:$trx"]);

    if (!$deleted) {
        response(["success" => false, "message" => "Transaction not found"], 404);
    }

    response(["success" => true, "message" => "Transaction deleted"]);
}

// ===================
// REPORT TRANSACTIONS
// ===================
if ($method === "GET" && $uri[0] === "reports" && $uri[1] === "transactions") {
    $keys = $redis->keys("transaction:*");
    $transactions = [];
    $total = 0;

    foreach ($keys as $key) {
        $trx = json_decode($redis->get($key), true);
        foreach ($trx["items"] as $item) {
            $total += (int)($item["subtotal"] ?? 0);
        }
        $transactions[] = $trx;
    }

    response([
        "success" => true,
        "summary" => [
            "total_transaksi" => count($transactions),
            "total_pendapatan" => $total
        ],
        "data" => $transactions
    ]);
}

response(["success" => false, "message" => "Route not found"], 404);
