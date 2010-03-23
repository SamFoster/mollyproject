def geolocation(request):
    """
    Provides location-based information to the template (i.e. lat/long, google
    placemark data, and whether we would like to request the device's location
    information.
    """

    # Use the epoch in the place of -inf; a time it has been a while since.
    epoch = datetime(1970,1,1, 0, 0, 0)
    
    # Only request a location if our current location is older than one minute
    # and the user isn't updating their location manually.
    # The one minute timeout applies to the more recent of a request and an
    # update.
    
    location = request.session['geolocation:requested']
    requested = request.session.get('geolocation:requested', epoch)
    updated = request.session.get('geolocation:updated', epoch)
    method = request.session.get('geolocation:method')
    
    if max(requested, updated) + timedelta(0, 60) < datetime.now() and method in ('html5', 'gears', None):
        require_location = True
        request.session['geolocation:requested'] = datetime.now()
    else:
        require_location = False
    
    return {
        'require_location': require_location,
        'geolocation': {
            'location': request.session.get('geolocation:location'),
            'name': request.session.get('geolocation:name'),
            'accuracy' request.session.get('geolocation:accuracy'),
        },
    }