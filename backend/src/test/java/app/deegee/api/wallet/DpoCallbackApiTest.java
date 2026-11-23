package app.deegee.api.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * DPO's callback is unsigned, so the only question that matters here is whether a stranger who
 * POSTs to it can get a song for nothing. The answer has to be no, and the reason is that the
 * callback is never believed: it names a transaction, and Deegee asks DPO what happened to it.
 *
 * <p>{@link DpoGateway} is mocked because it is the thing that would talk to DPO, and nothing here
 * can. What is under test is everything around it: that the question gets asked at all, that the
 * answer is what decides, and that no answer means no song.
 */
class DpoCallbackApiTest extends StudioTestSupport {

    @MockitoBean
    DpoGateway dpo;

    @Autowired
    PaymentIntentRepository intents;

    private PaymentIntent intentWithToken(String token, String fan, long amount) throws Exception {
        String ref = startTopUp(fan, newPhone(), amount);
        PaymentIntent intent = intents.findByProviderRef(ref).orElseThrow();
        intent.rememberProviderToken(token);
        return intents.save(intent);
    }

    @Test
    @DisplayName("a forged callback gets nothing: DPO is asked, and DPO says no")
    void forgedCallbackIsWorthless() throws Exception {
        String fan = signIn(newPhone());
        intentWithToken("TOKEN-FORGED", fan, 25_000);

        // Whatever DPO's real answer is, it is DPO's answer and not the caller's. Here: not paid.
        org.mockito.Mockito.when(dpo.verify("TOKEN-FORGED")).thenReturn(java.util.Optional.of("901"));

        mvc.perform(post("/v1/webhooks/dpo").param("TransactionToken", "TOKEN-FORGED"))
                .andExpect(status().isNoContent());

        assertThat(walletBalance(fan))
                .as("a caller claiming success must not be able to move money")
                .isZero();
    }

    @Test
    @DisplayName("a real payment credits the wallet, on DPO's word rather than the caller's")
    void verifiedPaymentCredits() throws Exception {
        String fan = signIn(newPhone());
        intentWithToken("TOKEN-GOOD", fan, 30_000);
        org.mockito.Mockito.when(dpo.verify("TOKEN-GOOD")).thenReturn(java.util.Optional.of(Dpo.OK));

        mvc.perform(post("/v1/webhooks/dpo").param("TransactionToken", "TOKEN-GOOD"))
                .andExpect(status().isNoContent());

        assertThat(walletBalance(fan)).isEqualTo(30_000);
    }

    @Test
    @DisplayName("if DPO cannot be reached the payment stays pending rather than being guessed at")
    void noAnswerMeansNoDecision() throws Exception {
        String fan = signIn(newPhone());
        intentWithToken("TOKEN-SILENT", fan, 12_000);
        org.mockito.Mockito.when(dpo.verify("TOKEN-SILENT")).thenReturn(java.util.Optional.empty());

        mvc.perform(post("/v1/webhooks/dpo").param("TransactionToken", "TOKEN-SILENT"))
                .andExpect(status().isNoContent());

        // Not credited, and not failed either: the money is either with DPO or still with the fan,
        // and both are recoverable. Awarding the song here would be guessing with a catalogue.
        assertThat(walletBalance(fan)).isZero();
    }

    @Test
    @DisplayName("an unknown transaction is ignored quietly, and DPO is never even asked")
    void unknownTransactionIsIgnored() throws Exception {
        mvc.perform(post("/v1/webhooks/dpo").param("TransactionToken", "NOT-A-REAL-TOKEN"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/v1/webhooks/dpo").param("CompanyRef", "NOT-A-REAL-REF"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/v1/webhooks/dpo")).andExpect(status().isNoContent());

        org.mockito.Mockito.verify(dpo, org.mockito.Mockito.never()).verify(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("the customer's own browser landing back works the same way as the server callback")
    void redirectIsHandledToo() throws Exception {
        String fan = signIn(newPhone());
        PaymentIntent intent = intentWithToken("TOKEN-REDIRECT", fan, 8_000);
        org.mockito.Mockito.when(dpo.verify("TOKEN-REDIRECT")).thenReturn(java.util.Optional.of(Dpo.OK));

        mvc.perform(get("/v1/webhooks/dpo").param("CompanyRef", intent.getProviderRef()))
                .andExpect(status().isNoContent());

        assertThat(walletBalance(fan)).isEqualTo(8_000);
    }
}
