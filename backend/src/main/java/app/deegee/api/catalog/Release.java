package app.deegee.api.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.List;

@Entity
@Table(name = "releases")
public class Release {

    public enum Type {
        SINGLE("Single"), EP("EP"), ALBUM("Album");

        private final String label;

        Type(String label) { this.label = label; }

        public String label() { return label; }
    }

    @Id
    private String id;

    @Column(name = "artist_id", nullable = false)
    private String artistId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Type type;

    @Column(name = "release_year", nullable = false)
    private int year;

    @Column(name = "price_ugx", nullable = false)
    private long priceUgx;

    @Column(name = "color_a", nullable = false, length = 7)
    private String colorA;

    @Column(name = "color_b", nullable = false, length = 7)
    private String colorB;

    @Column(nullable = false)
    private boolean exclusive;

    protected Release() {}

    public String getId() { return id; }
    public String getArtistId() { return artistId; }
    public String getTitle() { return title; }
    public Type getType() { return type; }
    public int getYear() { return year; }
    public long getPriceUgx() { return priceUgx; }
    public boolean isExclusive() { return exclusive; }
    public List<String> getColors() { return List.of(colorA, colorB); }
}
