package com.hospital.signage.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.signage.application.port.in.AssetUseCase;
import com.hospital.signage.application.service.UserCacheService;
import com.hospital.signage.domain.enums.Material;
import com.hospital.signage.domain.enums.AssetStatus;
import com.hospital.signage.domain.model.Asset;
import com.hospital.signage.infrastructure.security.JwtAuthenticationFilter;
import com.hospital.signage.infrastructure.security.JwtTokenProvider;
import com.hospital.signage.infrastructure.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.data.domain.PageImpl;

import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AssetController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@WithMockUser(username = "admin", authorities = {"ASSET_MANAGE"})
public class AssetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AssetUseCase assetUseCase;

    @MockBean
    private UserCacheService userCacheService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    public void testGetAllAssets() throws Exception {
        Asset asset1 = new Asset();
        asset1.setId(UUID.randomUUID());
        asset1.setAssetCode("ASSET-001");
        asset1.setMaterial(Material.LED);
        asset1.setStatus(AssetStatus.ACTIVE);

        Asset asset2 = new Asset();
        asset2.setId(UUID.randomUUID());
        asset2.setAssetCode("ASSET-002");
        asset2.setMaterial(Material.INOX);
        asset2.setStatus(AssetStatus.DAMAGED);

        when(assetUseCase.getAssetsPage(eq(0), eq(10), eq(""), any()))
                .thenReturn(new PageImpl<>(Arrays.asList(asset1, asset2)));

        mockMvc.perform(get("/api/assets")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].assetCode").value("ASSET-001"))
                .andExpect(jsonPath("$.content[1].assetCode").value("ASSET-002"));
    }

    @Test
    public void testGetAssetById() throws Exception {
        UUID id = UUID.randomUUID();
        Asset asset = new Asset();
        asset.setId(id);
        asset.setAssetCode("ASSET-001");
        asset.setStatus(AssetStatus.ACTIVE);

        when(assetUseCase.getAssetById(id)).thenReturn(Optional.of(asset));

        mockMvc.perform(get("/api/assets/" + id)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetCode").value("ASSET-001"));
    }

    @Test
    public void testGetAssetByIdNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        when(assetUseCase.getAssetById(id)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/assets/" + id)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testCreateAsset() throws Exception {
        Asset asset = new Asset();
        asset.setAssetCode("ASSET-NEW");
        asset.setMaterial(Material.ALU);
        asset.setStatus(AssetStatus.ACTIVE);

        Asset savedAsset = new Asset();
        savedAsset.setId(UUID.randomUUID());
        savedAsset.setAssetCode("ASSET-NEW");
        savedAsset.setMaterial(Material.ALU);
        savedAsset.setStatus(AssetStatus.ACTIVE);

        when(assetUseCase.createAsset(any(Asset.class))).thenReturn(savedAsset);

        mockMvc.perform(post("/api/assets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(asset)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetCode").value("ASSET-NEW"));
    }

    @Test
    public void testDeleteAsset() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(assetUseCase).deleteAsset(any(), any());

        mockMvc.perform(delete("/api/assets/" + id)
                        .with(csrf()))
                .andExpect(status().isOk());
    }
}
