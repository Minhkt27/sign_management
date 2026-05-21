package com.hospital.signage.infrastructure.storage;

import com.hospital.signage.application.port.out.FileStoragePort;
import io.minio.*;
import io.minio.errors.MinioException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Slf4j
@Component
@RequiredArgsConstructor
public class MinioStorageAdapter implements FileStoragePort {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucketName;

    @Value("${minio.public-url}")
    private String publicUrl;

    @PostConstruct
    public void initBucket() {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                String policy = """
                        {
                          "Version": "2012-10-17",
                          "Statement": [{
                            "Effect": "Allow",
                            "Principal": {"AWS": ["*"]},
                            "Action": ["s3:GetObject"],
                            "Resource": ["arn:aws:s3:::%s/*"]
                          }]
                        }
                        """.formatted(bucketName);
                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
                log.info("MinIO bucket '{}' created with public-read policy", bucketName);
            }
        } catch (Exception e) {
            log.warn("MinIO initialization skipped: {}", e.getMessage());
        }
    }

    @Override
    public String store(String filename, InputStream content, long size, String contentType) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(filename)
                    .stream(content, size, -1)
                    .contentType(contentType)
                    .build());
            return publicUrl + "/" + bucketName + "/" + filename;
        } catch (Exception e) {
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to delete object '{}' from MinIO: {}", objectName, e.getMessage());
        }
    }
}
