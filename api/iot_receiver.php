<?php

// Simulate IoT data (device + location)

function getIoTData() {

    $devices = ['device-1001', 'device-2002', 'device-3003'];
    $locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'];

    return [
        'device_id' => $devices[array_rand($devices)],
        'location' => $locations[array_rand($locations)],
        'time' => date("Y-m-d H:i:s")
    ];
}

?>