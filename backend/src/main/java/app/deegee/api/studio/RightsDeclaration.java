package app.deegee.api.studio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * The uploader's answers about who owns a release's recordings. If an answer was false, responsibility
 * points to the person who accepted it (accepted_by, accepted_at).
 */
@Entity
@Table(name = "rights_declarations")
public class RightsDeclaration {

    public enum LabelDeal { YES, NO, NOT_SURE }

    @Id
    @Column(name = "release_id")
    private String releaseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "signed_to_label", nullable = false, length = 10)
    private LabelDeal signedToLabel;

    @Column(name = "label_name", length = 120)
    private String labelName;

    @Column(name = "released_before", nullable = false)
    private boolean releasedBefore;

    @Column(name = "previous_distributor", length = 120)
    private String previousDistributor;

    @Column(name = "cover_or_samples", nullable = false)
    private boolean coverOrSamples;

    @Column(name = "label_letter_key", length = 200)
    private String labelLetterKey;

    @Column(name = "accepted_by", nullable = false)
    private UUID acceptedBy;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;

    protected RightsDeclaration() {}

    RightsDeclaration(String releaseId) {
        this.releaseId = releaseId;
    }

    void answer(LabelDeal signedToLabel, String labelName, boolean releasedBefore, String previousDistributor,
                boolean coverOrSamples, UUID acceptedBy, Instant now) {
        this.signedToLabel = signedToLabel;
        this.labelName = signedToLabel == LabelDeal.NO ? null : labelName;
        this.releasedBefore = releasedBefore;
        this.previousDistributor = releasedBefore ? previousDistributor : null;
        this.coverOrSamples = coverOrSamples;
        this.acceptedBy = acceptedBy;
        this.acceptedAt = now;
    }

    void setLabelLetterKey(String key) { this.labelLetterKey = key; }

    public String getReleaseId() { return releaseId; }
    public LabelDeal getSignedToLabel() { return signedToLabel; }
    public String getLabelName() { return labelName; }
    public boolean isReleasedBefore() { return releasedBefore; }
    public String getPreviousDistributor() { return previousDistributor; }
    public boolean isCoverOrSamples() { return coverOrSamples; }
    public String getLabelLetterKey() { return labelLetterKey; }
    public UUID getAcceptedBy() { return acceptedBy; }
    public Instant getAcceptedAt() { return acceptedAt; }
}
