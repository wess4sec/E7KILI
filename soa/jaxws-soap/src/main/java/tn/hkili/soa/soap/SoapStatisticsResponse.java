package tn.hkili.soa.soap;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;

import java.math.BigDecimal;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(
        name = "StatistiquesConversation",
        namespace = HkiliSoapService.NAMESPACE,
        propOrder = {
                "conversationId",
                "title",
                "totalMessages",
                "userMessages",
                "assistantMessages",
                "averageWordsPerMessage"
        }
)
@XmlRootElement(
        name = "statistiquesResponse",
        namespace = HkiliSoapService.NAMESPACE
)
public class SoapStatisticsResponse {
    @XmlElement(name = "idConversation", required = true)
    private String conversationId;

    @XmlElement(name = "titre", required = true)
    private String title;

    @XmlElement(name = "nombreTotalMessages")
    private int totalMessages;

    @XmlElement(name = "nombreMessagesUtilisateur")
    private int userMessages;

    @XmlElement(name = "nombreMessagesAssistant")
    private int assistantMessages;

    @XmlElement(name = "moyenneMotsParMessage")
    private BigDecimal averageWordsPerMessage;

    public SoapStatisticsResponse() {
    }

    public SoapStatisticsResponse(
            String conversationId,
            String title,
            int totalMessages,
            int userMessages,
            int assistantMessages,
            BigDecimal averageWordsPerMessage
    ) {
        this.conversationId = conversationId;
        this.title = title;
        this.totalMessages = totalMessages;
        this.userMessages = userMessages;
        this.assistantMessages = assistantMessages;
        this.averageWordsPerMessage = averageWordsPerMessage;
    }

    public String getConversationId() {
        return conversationId;
    }

    public String getTitle() {
        return title;
    }

    public int getTotalMessages() {
        return totalMessages;
    }

    public int getUserMessages() {
        return userMessages;
    }

    public int getAssistantMessages() {
        return assistantMessages;
    }

    public BigDecimal getAverageWordsPerMessage() {
        return averageWordsPerMessage;
    }
}
