<?php
$conn = new mysqli("cart-db","root","root","cart_db");

if ($_SERVER['REQUEST_METHOD']=='POST') {
  $d=json_decode(file_get_contents("php://input"),true);
  $conn->query("INSERT INTO cart(user_id,product_id)
                VALUES ({$d['user_id']},{$d['product_id']})");
  echo json_encode(["message"=>"added"]);
}

if ($_SERVER['REQUEST_METHOD']=='GET') {
  $r=$conn->query("SELECT * FROM cart");
  $data=[];
  while($row=$r->fetch_assoc()) $data[]=$row;
  echo json_encode($data);
}
