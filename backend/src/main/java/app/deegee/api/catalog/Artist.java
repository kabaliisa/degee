package app.deegee.api.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "artists")
public class Artist {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false, length = 500)
    private String bio;

    @Column(nullable = false)
    private String genres;

    @Column(nullable = false)
    private boolean verified;

    @Column(name = "color_a", nullable = false, length = 7)
    private String colorA;

    @Column(name = "color_b", nullable = false, length = 7)
    private String colorB;

    protected Artist() {}

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getBio() { return bio; }
    public boolean isVerified() { return verified; }
    public List<String> getGenres() { return Arrays.stream(genres.split(",")).map(String::trim).filter(g -> !g.isEmpty()).toList(); }
    public List<String> getColors() { return List.of(colorA, colorB); }
}
