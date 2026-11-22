package app.deegee.api.studio;

import app.deegee.api.common.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** What an artist can see about their own trade. There is no id to pass: it is yours or nothing. */
@RestController
class InsightsController {

    private final InsightsService insights;

    InsightsController(InsightsService insights) {
        this.insights = insights;
    }

    @GetMapping("/v1/artist/insights")
    Insights insights(@AuthenticationPrincipal Jwt jwt) {
        return insights.forOwner(CurrentUser.id(jwt));
    }
}
