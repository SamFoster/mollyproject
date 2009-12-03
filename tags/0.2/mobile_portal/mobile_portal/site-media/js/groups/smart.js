/************************************
 * (C) University of Oxford 2009    *
 * E-mail: erewhon AT oucs.ox.ac.uk *
 ************************************/



/************************************
 *           Geolocation            *
 ************************************/

var positionRequestCount = 0;
var positionWatchId = null;
var positionInterface = null;
var positionMethod = null;
var positionGeo = null;
var manualUpdateLocation = null;


function sendPosition(position, final) {
    if (positionRequestCount == 1)
        $('.location-status').html('Location found; please wait while we put a name to it.');
        
    jQuery.post(base+'update_location/', {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
        accuracy: position.coords.accuracy,
        method: positionMethod,
        format: 'json',
    }, function(data) {
        positionName = data.name;
        $('.location').html(data.name);
        $('.location-status').html('We think you are somewhere near <span class="location">'+data.name+'</span>.');

    }, 'json');
}

function sendPositionError(error) {
    if (error.code == error.PERMISSION_DENIED) {
        $('.location-status').html(
            'You did not give permission for the site to know your location. '
          + 'You won\'t be asked again unless you initiate an automatic '
          + 'update using the link below.');
        jQuery.post(base+'ajax/update_location/', {
            method: 'denied',
        });
    } else if (error.code == error.POSITION_UNAVAILABLE) {
        $('.location-status').html(
            'We were unable to determine your location at this time. Please '
          + 'try again later, or enter your location manually.'
        );
    } else {
        $('.location-status').html(
            'An error occured while determining your location.'
        );
        jQuery.post(base+'ajax/update_location/', {
            method: 'error',
        });
    }
}

function getGearsPositionInterface(name) {
    if (positionGeo == null)
        positionGeo = google.gears.factory.create('beta.geolocation');
    geo = positionGeo;
    
    function wrapWithPermission(fname) {
        return function(successCallback, errorCallback, options) {
            if (geo.getPermission(name)) {
                if (fname == 'gcp')
                    return geo.getCurrentPosition(successCallback, errorCallback, options);
                else
                    return geo.watchPosition(successCallback, errorCallback, options);
            } else
                errorCallback({
                    PERMISSION_DENIED: geo.PositionEror.PERMISSION_DENIED,
                    code: geo.PositionError.PERMISSION_DENIED,
                });
        };
    }
    
    return {
        getCurrentPosition: wrapWithPermission('getCurrentPosition'),
        watchPosition: wrapWithPermission('watchPosition'),
        clearWatch: function(id) {
            geo.clearWatch(id);
        },
    }
}

function positionWatcher(position) {
    positionRequestCount += 1;
    if (positionRequestCount > 10 || position.coords.accuracy <= 150 || position.coords.accuracy == 18000) {
        positionInterface.clearWatch(positionWatchId);
        positionWatchId = null;
        $('.location-action').html(
            ' <a class="update-location-toggle" href="#" onclick="javascript:toggleUpdateLocation();">Update</a>');
    }
    
    sendPosition(position, positionWatchId != null);
}

function requestPosition() {
    $('.update-location').slideUp();
    if (positionWatchId != null)
        return; 
        
    location_options = {
            enableHighAccuracy: true,
            maximumAge: 30000,
    }
    if (window.google && google.gears) {
        positionInterface = getGearsPositionInterface('Oxford Mobile Portal');
        positionMethod = 'gears';
    } else if (window.navigator && navigator.geolocation) {
        positionInterface = navigator.geolocation;
        positionMethod = 'html5';
    }
    
    positionRequestCount = 0;
    
    if (positionInterface) {
        $('.location-status').html('Please wait while we attempt to determine your location...');
        $('.location-action').html(
            ' <a class="update-location-cancel" href="#" onclick="javascript:cancelUpdateLocation();;">Cancel</a>');
        positionWatchId = positionInterface.watchPosition(positionWatcher, sendPositionError, location_options);
    } else
        $('.location-status').html('We have no means of determining your location automatically.');
}

function positionMethodAvailable() {
    return ((window.navigator && navigator.geolocation) || (window.google && google.gears))
}

function toggleUpdateLocation(event) {
    updateLocationToggle = $('.update-location-toggle');
    
    if (updateLocationToggle.html() == 'Update') {
        $('.update-location').slideDown();
        updateLocationToggle.html('Cancel');
    } else {
        $('.update-location').slideUp();
        updateLocationToggle.html('Update');
    }
    event.stopPropagation();
    return false;
}

function cancelUpdateLocation() {
    positionRequestCount = 11;
    if (positionName)
        $('.location-status').html('We think you are somewhere near <span class="location">'+positionName+'</span>.');
    else
        $('.location-status').html('We do not know where you are.');
    $('.location-action').html(
        ' <a class="update-location-toggle" href="#" onclick="javascript:toggleUpdateLocation();;">Update</a>');

}

function cancelManualUpdateLocation() {
    positionRequestCount = 11;
    if (positionName)
        $('.location-status').html('We think you are somewhere near <span class="location">'+positionName+'</span>.');
    else
        $('.location-status').html('We do not know where you are.');
    $('.location-action').html(
        ' <a class="update-location-toggle" href="#" onclick="javascript:toggleUpdateLocation();;">Update</a>');

    $('.update-location').slideUp('normal', function() {
        $('.manual-update-location').replaceWith(manualUpdateLocation);
    });
        
}

function manualLocationSubmit(event) {
    $('.manual-update-location-submit').css('display', 'none');
    
    $('.location-action').html(
            ' <a class="update-location-cancel" href="#" onclick="javascript:cancelManualUpdateLocation();;">Cancel</a>');
    manualUpdateLocation = $('.manual-update-location').clone(true);
        
    $.get(base+'update_location/', {
        method: 'geocoded',
        name: $('#location-name').val(),
        format: 'embed',
        return_url: window.location.href,
    }, function(data) {
        
        $('.manual-update-location').html(data);
        $('.submit-location-form').each(function () {
            button = $(this).find(".submit-location-form-button");
            link = $('<a href="#">'+button.html()+'</a>');
            link.css('color', '#ffffff').bind('click', {form:this}, function(event) {
                form = $(event.data.form);
                $.post(base+'update_location/', {
                    longitude: form.find('[name=longitude]').val(),
                    latitude: form.find('[name=latitude]').val(),
                    accuracy: form.find('[name=accuracy]').val(),
                    name: form.find('[name=name]').val(),
                    method: 'geocoded',
                    format: 'json',
                }, function() {
                    positionName = form.find('[name=name]').val();
                    cancelManualUpdateLocation();
                });
            });
            button.replaceWith(link);
        });
    });

    return false;
}
    
if (require_location)
    jQuery(document).ready(requestPosition);


$(document).ready(function() {
    $('.update-location').css('display', 'none');
    $('.location-action').html(
        ' <a class="update-location-toggle" href="#" onclick="javascript:toggleUpdateLocation();">Update</a>');
        
    if (positionMethodAvailable()) {
        $('#geolocate-js').html(
            '<a href="#" onclick="javascript:requestPosition();">Determine location automaticaly</a>');
    }
    
    $('.manual-update-form').bind('submit', manualLocationSubmit);
    $('.manual-update-form').bind('submit', function(){ return false; });
});