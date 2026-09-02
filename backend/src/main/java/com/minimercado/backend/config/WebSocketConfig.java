package com.minimercado.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;


@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOrigins;
    private final SettingsAdminAuthorizer authorizer;

    public WebSocketConfig(
            @Value("${app.cors.allowed-origins:*}") String allowedOrigins,
            SettingsAdminAuthorizer authorizer) {
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
        this.authorizer = authorizer;
    }


    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");

        registry.setApplicationDestinationPrefixes("/app");
    }


    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (accessor.getCommand() == StompCommand.CONNECT) {
                    boolean authenticated = !authorizer.isConfigured();
                    if (!authenticated) {
                        try {
                            authorizer.authorize(accessor.getFirstNativeHeader("X-Admin-Key"));
                            authenticated = true;
                        } catch (org.springframework.web.server.ResponseStatusException ignored) {
                            authenticated = false;
                        }
                    }
                    if (accessor.getSessionAttributes() != null) {
                        accessor.getSessionAttributes().put("operationalAccess", authenticated);
                    }
                }
                if (accessor.getCommand() == StompCommand.SUBSCRIBE
                        && !"/topic/orders/public".equals(accessor.getDestination())) {
                    Object authenticated = accessor.getSessionAttributes() == null
                            ? null : accessor.getSessionAttributes().get("operationalAccess");
                    if (!Boolean.TRUE.equals(authenticated)) {
                        throw new org.springframework.messaging.MessageDeliveryException("Acesso operacional necessario");
                    }
                }
                return message;
            }
        });
    }
}
