// Formatos locais enquanto o módulo `companies` do backend (Desafio 03) não publica o contrato.

export type EmployeeStatus = "active" | "invited";

export type Employee = {
  name: string;
  area: string;
  email: string;
  status: EmployeeStatus;
};

export type CertificateStatus = "review" | "organized";

export type Certificate = {
  fileName: string;
  employee: string;
  area: string;
  receivedAt: string;
  status: CertificateStatus;
};
