package com.minimercado.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
public class AppSettings {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Version
    private Long version;

    @Column(nullable = false, length = 80)
    private String businessName;

    @Column(nullable = false, length = 12)
    private String shortName;

    @Column(nullable = false, length = 120)
    private String tagline;

    @Column(nullable = false, length = 240)
    private String description;

    @Column(nullable = false, length = 120)
    private String homeTitle;

    @Column(nullable = false, length = 300)
    private String homeDescription;

    @Column(nullable = false, length = 160)
    private String footerText;

    @Column(nullable = false, length = 120)
    private String panelTitle;

    @Column(nullable = false, length = 180)
    private String panelSubtitle;

    @Column(nullable = false, length = 7)
    private String primaryColor;

    @Column(nullable = false, length = 7)
    private String secondaryColor;

    @Column(nullable = false, length = 7)
    private String accentColor;

    @Column(nullable = false, length = 7)
    private String backgroundColor;

    @Column(nullable = false, length = 7)
    private String surfaceColor;

    @Column(nullable = false, length = 7)
    private String textColor;

    @Column(nullable = false, length = 7)
    private String mutedTextColor;

    @Column(nullable = false, length = 7)
    private String borderColor;

    @Column(nullable = false, length = 7)
    private String preparingColor;

    @Column(nullable = false, length = 7)
    private String readyColor;

    @Column(nullable = false, length = 7)
    private String destructiveColor;

    @Column(nullable = false)
    private Integer borderRadius;

    @Column(nullable = false, length = 30)
    private String fontFamily;

    @Column(nullable = false)
    private Instant updatedAt;
}
