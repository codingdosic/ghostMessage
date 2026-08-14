package com.ghostMessage.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MessageRequestDTO {

    @NotNull
    private UUID authorId;

    @NotBlank
    @Size(max = 2000)
    private String pageUrl;

    @NotBlank
    @Size(max = 2000)
    private String anchorKey;

    @Size(max = 2000)
    private String selector;

    @Size(max = 2000)
    private String linkText;

    @Size(max = 2000)
    private String imgSrc;

    @Size(max = 50)
    private String type;

    @NotBlank
    @Size(max = 100)
    private String content;
}
