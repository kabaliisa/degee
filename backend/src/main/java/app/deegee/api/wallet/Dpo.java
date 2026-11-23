package app.deegee.api.wallet;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

/**
 * The small amount of XML handling DPO's API needs.
 *
 * <p>DPO speaks XML, not JSON: every request is an {@code <API3G>} document posted to the same
 * endpoint, with a {@code <Request>} element naming the operation. Six fields do not justify a
 * marshalling library, and hand-built strings are easier to read against their documentation than
 * annotated classes would be.
 */
final class Dpo {

    /** DPO's "it worked". Every other code is a refusal with an explanation beside it. */
    static final String OK = "000";

    private Dpo() {}

    /**
     * Escapes a value going into the request. Deegee's own references are UUIDs, but a song title
     * reaching an XML document unescaped would break the request on the first apostrophe, and a
     * title is something an artist types.
     */
    static String xml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    /** The text of the first element with this name, or empty when DPO did not send one. */
    static Optional<String> field(Document doc, String name) {
        NodeList found = doc.getElementsByTagName(name);
        if (found.getLength() == 0) return Optional.empty();
        String text = found.item(0).getTextContent();
        return text == null || text.isBlank() ? Optional.empty() : Optional.of(text.trim());
    }

    /**
     * Parses a response from DPO.
     *
     * <p>External XML with the usual doors shut: no DTDs and no external entities, because a
     * parser that fetches whatever a document tells it to is how an XML endpoint becomes a way to
     * read files off the server.
     */
    static Document parse(String body) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder()
                .parse(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    }
}
