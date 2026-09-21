<?php
date_default_timezone_set('Asia/Amman');
$currentTime = date('Y-m-d h:i:s A');
$currentHour = date('G'); // Get the current hour (24-hour format)
$effectiveDate = date('Y-m-d');
$shift = '';

if (($currentHour >= 7 && $currentHour < 18) || ($effectiveDate == date('Y-m-d', strtotime('-1 day', strtotime('tomorrow'))) && $currentHour < 5)) {
    $shift = 'A';
} elseif ($currentHour >= 18 || ($effectiveDate == date('Y-m-d', strtotime('tomorrow')) && $currentHour < 5)) {
    $shift = 'B';
}   