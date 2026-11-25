package tn.hkili.soa.soap;

import jakarta.annotation.Resource;
import jakarta.jws.WebMethod;
import jakarta.jws.WebParam;
import jakarta.jws.WebService;
import jakarta.xml.soap.SOAPConstants;
import jakarta.xml.soap.SOAPException;
import jakarta.xml.soap.SOAPFactory;
import jakarta.xml.soap.SOAPFault;
import jakarta.xml.ws.WebServiceContext;
import jakarta.xml.ws.handler.MessageContext;
import jakarta.xml.ws.soap.SOAPFaultException;
import tn.hkili.soa.client.NodeApi;
import tn.hkili.soa.client.NodeApiException;

import javax.xml.namespace.QName;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@WebService(
        name = "HkiliSoapPortType",
        serviceName = "HkiliSoapService",
        targetNamespace = HkiliSoapService.NAMESPACE
)
public class HkiliSoapService {
    public static final String NAMESPACE = "urn:hkili:soa";
    private static final Pattern CONVERSATION_ID =
            Pattern.compile("^[a-fA-F0-9]{24}$");
    private static final int PAGE_SIZE = 100;
    private static final int MAX_PAGES = 1_000;

    private final NodeApi nodeApi;

    @Resource
    private WebServiceContext webServiceContext;

    public HkiliSoapService(NodeApi nodeApi) {
        this.nodeApi = nodeApi;
    }

    @WebMethod(exclude = true)
    public void setWebServiceContext(WebServiceContext webServiceContext) {
        this.webServiceContext = webServiceContext;
    }

    @WebMethod(operationName = "compterMots")
    public int compterMots(@WebParam(name = "texte") String texte) {
        if (texte == null || texte.isBlank()) {
            return 0;
        }
        return (int) List.of(texte.strip().split("(?U)[\\s\\p{Z}]+")).size();
    }

    @WebMethod(operationName = "statistiques")
    public SoapStatisticsResponse statistiques(
            @WebParam(name = "idConversation") String idConversation
    ) {
        if (idConversation == null
                || !CONVERSATION_ID.matcher(idConversation).matches()) {
            throw soapFault("Client", "The conversation identifier is invalid");
        }

        String authorization = authorizationHeader();
        if (authorization == null) {
            throw soapFault("Client", "A bearer token is required");
        }

        try {
            Map<String, Object> firstPage = nodeApi.getConversation(
                    idConversation,
                    1,
                    PAGE_SIZE,
                    authorization
            );
            Map<String, Object> conversation =
                    objectValue(firstPage.get("conversation"));
            Map<String, Object> pagination =
                    objectValue(firstPage.get("pagination"));
            int totalPages = numberValue(pagination.get("totalPages"), 1);
            if (totalPages < 1 || totalPages > MAX_PAGES) {
                throw soapFault("Server", "The conversation is too large to summarize");
            }

            int totalMessages = numberValue(pagination.get("total"), 0);
            int userMessages = 0;
            int assistantMessages = 0;
            long totalWords = 0;
            for (int page = 1; page <= totalPages; page++) {
                Map<String, Object> response = page == 1
                        ? firstPage
                        : nodeApi.getConversation(
                                idConversation,
                                page,
                                PAGE_SIZE,
                                authorization
                        );
                Object rawMessages = response.get("messages");
                if (!(rawMessages instanceof List<?> messages)) {
                    throw soapFault("Server", "The Hkili backend returned invalid data");
                }
                for (Object rawMessage : messages) {
                    Map<String, Object> message = objectValue(rawMessage);
                    String role = stringValue(message.get("role"));
                    if ("user".equals(role)) {
                        userMessages++;
                    } else if ("assistant".equals(role)) {
                        assistantMessages++;
                    }
                    totalWords += countWords(stringValue(message.get("content")));
                }
            }

            BigDecimal average = totalMessages == 0
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.valueOf(totalWords)
                            .divide(BigDecimal.valueOf(totalMessages), 2, RoundingMode.HALF_UP);

            return new SoapStatisticsResponse(
                    idConversation,
                    stringValue(conversation.get("title")),
                    totalMessages,
                    userMessages,
                    assistantMessages,
                    average
            );
        } catch (NodeApiException exception) {
            throw mapNodeFault(exception);
        }
    }

    private String authorizationHeader() {
        if (webServiceContext == null) {
            return null;
        }
        MessageContext context = webServiceContext.getMessageContext();
        Object rawHeaders = context.get(MessageContext.HTTP_REQUEST_HEADERS);
        if (!(rawHeaders instanceof Map<?, ?> headers)) {
            return null;
        }
        for (Map.Entry<?, ?> entry : headers.entrySet()) {
            if (entry.getKey() instanceof String name
                    && "authorization".equals(name.toLowerCase(Locale.ROOT))
                    && entry.getValue() instanceof List<?> values
                    && !values.isEmpty()
                    && values.get(0) instanceof String value
                    && value.regionMatches(true, 0, "Bearer ", 0, 7)) {
                return value;
            }
        }
        return null;
    }

    private static int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.strip().split("(?U)[\\s\\p{Z}]+").length;
    }

    private static int numberValue(Object value, int defaultValue) {
        return value instanceof Number number ? number.intValue() : defaultValue;
    }

    private static String stringValue(Object value) {
        return value instanceof String text ? text : "";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> objectValue(Object value) {
        if (!(value instanceof Map<?, ?>)) {
            throw soapFault("Server", "The Hkili backend returned invalid data");
        }
        return (Map<String, Object>) value;
    }

    private static SOAPFaultException mapNodeFault(NodeApiException exception) {
        return switch (exception.getStatusCode()) {
            case 401 -> soapFault("Client", "Authentication is required or has expired");
            case 403 -> soapFault("Client", "Access to this conversation is denied");
            case 404 -> soapFault("Client", "The conversation was not found");
            case 429 -> soapFault("Server", "The AI service is rate limited");
            case 503, 504 -> soapFault("Server", "The Hkili backend is temporarily unavailable");
            default -> soapFault("Server", "The Hkili backend request failed");
        };
    }

    private static SOAPFaultException soapFault(String faultCode, String message) {
        try {
            SOAPFault fault = SOAPFactory.newInstance().createFault(
                    message,
                    new QName(
                            SOAPConstants.URI_NS_SOAP_1_1_ENVELOPE,
                            faultCode
                    )
            );
            return new SOAPFaultException(fault);
        } catch (SOAPException exception) {
            throw new IllegalStateException("Unable to create a SOAP fault", exception);
        }
    }
}
