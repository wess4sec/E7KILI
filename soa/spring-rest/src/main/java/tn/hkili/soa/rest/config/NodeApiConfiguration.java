package tn.hkili.soa.rest.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tn.hkili.soa.client.HttpNodeApiClient;
import tn.hkili.soa.client.NodeApi;
import tn.hkili.soa.rest.HkiliProperties;

@Configuration
public class NodeApiConfiguration {
    @Bean
    NodeApi nodeApi(HkiliProperties properties, ObjectMapper objectMapper) {
        properties.validate();
        return new HttpNodeApiClient(
                properties.getNodeApiBaseUrl(),
                properties.getNodeConnectTimeout(),
                properties.getNodeRequestTimeout(),
                objectMapper
        );
    }
}
