<?php
// Get the logged-in user's ID and first name
$userPlant = isset($_SESSION['user_plant']) ? $_SESSION['user_plant'] : '';


//$modules = ['DU01',    'DU02',    'DU03',    'DU04',    'DU05',    'DU06',    'DU07',    'DU08',    'DU09',    'DU10',    'DU11',    'DU12',    'DU13',    'DU14',    'DU15',    'DU16',    'DU17',    'DU18',    'DU19',    'DU20',    'DU21',    'DU22',    'DU23',    'DU24',    'DU25',    'DU26',    'DU27',    'DU28',    'DU29',    'DU30',    'DU31',    'DU32',    'DU33',    'DU34',    'DU35',    'DU36',    'DU37',    'DU38',    'DU39',    'DU40',    'DU41',    'DU42',    'DU43',    'DU44',    'DU45',    'DU46',    'DU47',    'DU48',    'DU49',    'DU50',    'DU51',    'DU52',    'DU53',    'DU54',    'DU55'];


// Assuming $userPlant is set to 'C153', 'C151', or 'C152'

if ($userPlant == 'C153') {
    $modules = generateModules('DU', 55);
} elseif ($userPlant == 'C151') {
    $modules = generateModules('SB', 50);
} elseif ($userPlant == 'C152') {
    $modules = generateModules('MDB', 20);
} else {
    // Default to original modules if userplant doesn't match any condition
    $modules = generateModules('DU', 55);
}

function generateModules($prefix, $count) {
    $result = [];
    for ($i = 1; $i <= $count; $i++) {
        $module = $prefix . str_pad($i, 2, '0', STR_PAD_LEFT);
        $result[] = $module;
    }
    return $result;
}


