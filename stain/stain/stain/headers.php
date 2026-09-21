<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.1.3/dist/css/bootstrap.min.css" integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">
<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.14.3/dist/umd/popper.min.js" integrity="sha384-ZMP7rVo3mIykV+2+9J3UJ46jBk0WLaUAdn689aCwoqbBJiSnjAK/l8WvCWPIPm49" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.1.3/dist/js/bootstrap.min.js" integrity="sha384-ChfqqxuZUCnJSK3+MXmPNIyE6ZbWh2IMqE241rYiqJxyMiZ6OW/JmZQ5stwEULTy" crossorigin="anonymous"></script>
<link rel="stylesheet" href="assets/style.css" />
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>


<div class="loading" id="loader_sp">Loading&#8230;</div>

<script>
    $(document).ready(function() {
        loader(false);
    });

    function loader(visible) {
        if (visible) {
            $('#loader_sp').show();
        } else {
            $('#loader_sp').hide();
        }
    }
</script>
<script>
        document.addEventListener("DOMContentLoaded", function () {
            var timeoutMinutes = 30; // Set the same timeout duration as in PHP
            var logoutTimeout = setTimeout(function () {
                window.location.href = 'logout.php'; // Adjust the URL to your logout script
            }, timeoutMinutes * 60 * 1000);

            // Reset the timeout on user activity
            document.addEventListener("mousemove", function () {
                clearTimeout(logoutTimeout);
                logoutTimeout = setTimeout(function () {
                    window.location.href = 'logout.php'; // Adjust the URL to your logout script
                }, timeoutMinutes * 60 * 1000);
            });
        });
    </script>
    <!-- <script>
    $(document).ready(function() {
        function refreshTable() {
            // AJAX request to fetch updated table content
            $.ajax({
                url: 'refresh_table.php', // Create a separate PHP file to handle the refresh
                method: 'GET',
                success: function(response) {
                    // Update the content of the table container
                    $('#table-container').html(response);
                },
                error: function(error) {
                    console.error('Error refreshing table:', error);
                }
            });
        }

        // Auto-refresh the table every 5 seconds (5000 milliseconds)
        setInterval(refreshTable, 5000);
    });
</script> -->
