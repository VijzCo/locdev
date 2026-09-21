<?php
if (isset($_POST['generate_excel'])) {
    require_once 'path/to/PHPExcel/IOFactory.php'; // Include the PHPExcel library

    // Create a new PHPExcel object
    $objPHPExcel = new PHPExcel();

    // Add your Excel data here, based on your database query

    // Save the Excel file
    $excelFileName = 'report_' . date('Y-m-d') . '.xlsx';
    $writer = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
    $writer->save($excelFileName);

    // Send the generated file to the user for download
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="' . $excelFileName . '"');
    header('Cache-Control: max-age=0');
    readfile($excelFileName);
    exit;
}
?>
