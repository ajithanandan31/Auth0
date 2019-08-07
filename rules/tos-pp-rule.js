function redirectToConsentForm(user, context, callback) {
    var isPPAccepted = user.user_metadata && user.user_metadata.isPPAccepted;
    var isTCAccepted = user.user_metadata && user.user_metadata.isTCAccepted;
    var pptimestamp = user.user_metadata.pptimestamp;
    var tctimestamp = user.user_metadata.tctimestamp;
    var updatedPPtimestamp = configuration.LAST_UPDATED_PP;
    var updatedTCtimestamp = configuration.LAST_UPDATED_TOS;

    var auth0Domain = auth0.baseUrl.match(/([^:]*:\/\/)?([^\/]+\.[^\/]+)/)[2];
    // redirect to consent form if user has not yet consented
    if ((!isTCAccepted && context.protocol !== 'redirect-callback') || updatedTCtimestamp > tctimestamp) {
        context.redirect = {
            url: configuration.TOS_FORM_URL +
                (configuration.TOS_FORM_URL.indexOf('?') === -1 ? '?' : '&') +
                'auth0_domain=' + encodeURIComponent(auth0Domain)
        };
    }
    else if ((!isPPAccepted && context.protocol !== 'redirect-callback') || updatedPPtimestamp > pptimestamp) {
        context.redirect = {
            url: configuration.PP_FORM_URL +
                (configuration.PP_FORM_URL.indexOf('?') === -1 ? '?' : '&') +
                'auth0_domain=' + encodeURIComponent(auth0Domain)
        };
    }

    // if user clicked 'I agree' on the consent form, persist it to their profile
    // so they don't get prompted again
    if (context.protocol === 'redirect-callback') {
        if (context.request.body.confirm === 'TOS') {
            user.user_metadata = user.user_metadata || {};
            user.user_metadata.isTCAccepted = true;
            user.user_metadata.tctimestamp = Date.now();

            auth0.users.updateUserMetadata(user.user_id, user.user_metadata);

            if (!isPPAccepted) {
                context.redirect = {
                    url: configuration.PP_FORM_URL +
                        (configuration.PP_FORM_URL.indexOf('?') === -1 ? '?' : '&') +
                        'auth0_domain=' + encodeURIComponent(auth0Domain)
                };
            }
        }
        else if (context.request.body.confirm === 'PP') {
            user.user_metadata = user.user_metadata || {};
            user.user_metadata.isPPAccepted = true;
            user.user_metadata.pptimestamp = Date.now();

            auth0.users.updateUserMetadata(user.user_id, user.user_metadata)
                .then(function () {
                    callback(null, user, context);
                })
                .catch(function (err) {
                    callback(err);
                });
        }
        else {
            callback(new UnauthorizedError('User did not consent!'));
        }
    }

    callback(null, user, context);
}