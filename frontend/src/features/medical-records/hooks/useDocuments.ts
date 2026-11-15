"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "../api";
import type { DocumentFilters, DocumentPatch, MedicalDocument } from "../types";
import { downloadName, saveBlob } from "../utils";

export const documentsQueryKey = ["documents"] as const;

export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: [...documentsQueryKey, filters],
    queryFn: () => api.listDocuments(filters),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.uploadDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DocumentPatch }) =>
      api.updateDocument(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (doc: MedicalDocument) =>
      saveBlob(await api.fetchDocumentFile(doc.id), downloadName(doc)),
  });
}
