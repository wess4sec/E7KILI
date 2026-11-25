package tn.hkili.soa.soap;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.xml.ws.Endpoint;
import tn.hkili.soa.client.HttpNodeApiClient;
import tn.hkili.soa.client.NodeApi;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;

public final class HkiliSoapServer {
    private HkiliSoapServer() {
    }

    public static void main(String[] args) throws InterruptedException {
        String host = setting("SOAP_HOST", "127.0.0.1");
        int port = Integer.parseInt(setting("SOAP_PORT", "8082"));
        String nodeBaseUrl = setting(
                "NODE_API_BASE_URL",
                "http://127.0.0.1:3000/api/v1"
        );
        Duration connectTimeout = Duration.ofSeconds(5);
        Duration requestTimeout = Duration.ofSeconds(50);
        NodeApi nodeApi = new HttpNodeApiClient(
                nodeBaseUrl,
                connectTimeout,
                requestTimeout,
                new ObjectMapper()
        );

        Endpoint endpoint = Endpoint.publish(
                "http://" + host + ":" + port + "/soap/hkili",
                new HkiliSoapService(nodeApi)
        );
        Runtime.getRuntime().addShutdownHook(new Thread(endpoint::stop));
        System.out.println("Hkili SOAP endpoint: http://" + host + ":" + port
                + "/soap/hkili");
        System.out.println("Hkili SOAP WSDL: http://" + host + ":" + port
                + "/soap/hkili?wsdl");
        new CountDownLatch(1).await();
    }

    private static String setting(String name, String defaultValue) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
