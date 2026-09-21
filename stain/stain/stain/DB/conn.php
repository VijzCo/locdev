<?php
// $serverName = "mcapseacutdev.database.windows.net";
// $connectionOptions = array(
//     "Database" => "MCAPSEADECUTDEV01",
//     "Uid" => "krecutdbadmin01",
//     "PWD" => "GE3Bdsdhy*N-"
// );

$serverName = "kreseakredatanlprd.database.windows.net";
$connectionOptions = array(
    "Database" => "KR_Dulayl",
    "Uid" => "KRDULAYLADMIN",
    "PWD" => "Kdu@jsfw@#`2437ds"
);

// Establish a connection to the SQL Server
$conn = sqlsrv_connect($serverName, $connectionOptions);

if (!$conn) {
    die(print_r(sqlsrv_errors(), true));
}
