package tn.hkili.soa.rest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableConfigurationProperties(HkiliProperties.class)
public class HkiliRestApplication {
    public static void main(String[] args) {
        SpringApplication.run(HkiliRestApplication.class, args);
    }
}
