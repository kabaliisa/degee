package app.deegee.api.audio;

/** A song's master was replaced; process it once the upload is saved. */
public record AudioUploaded(String trackId, String audioKey) {}
