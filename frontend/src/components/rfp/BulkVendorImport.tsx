import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

interface BulkVendorImportProps {
  onVendorsImported: (
    vendors: Array<{ name: string; email: string; tags: string }>
  ) => void;
}

export function BulkVendorImport({ onVendorsImported }: BulkVendorImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<Array<{
    name: string;
    email: string;
    tags: string;
  }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCSVString = (content: string) => {
    const lines = content.trim().split("\n");
    const vendors = [];

    // Detect header row and skip if present
    let startIndex = 0;
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes("name") || firstLine.includes("email")) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing - handle quoted fields
      const regex = /"([^"]*)"|([^,]+)/g;
      const fields: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        fields.push((match[1] || match[2] || "").trim());
      }

      if (fields.length >= 2) {
        const [name, email, ...tagsParts] = fields;
        vendors.push({
          name: name.trim(),
          email: email.trim(),
          tags: (tagsParts.join(",") || "").trim(),
        });
      }
    }

    return vendors;
  };

  const parseExcelFile = async (
    file: File
  ): Promise<Array<{ name: string; email: string; tags: string }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as string[][];

          const vendors = [];

          // Detect header row
          let startIndex = 0;
          if (rows.length > 0) {
            const firstRow = rows[0].map((cell) =>
              String(cell || "").toLowerCase()
            );
            if (
              firstRow.some((cell) => cell.includes("name")) ||
              firstRow.some((cell) => cell.includes("email"))
            ) {
              startIndex = 1;
            }
          }

          for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2 || !row[0] || !row[1]) continue;

            vendors.push({
              name: String(row[0] || "").trim(),
              email: String(row[1] || "").trim(),
              tags: String(row[2] || "").trim(),
            });
          }

          resolve(vendors);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      let vendors: Array<{ name: string; email: string; tags: string }> = [];

      if (fileExtension === "csv") {
        const text = await file.text();
        vendors = parseCSVString(text);
      } else if (["xlsx", "xls"].includes(fileExtension || "")) {
        vendors = await parseExcelFile(file);
      } else {
        setError("Please upload a CSV or Excel file");
        setIsLoading(false);
        return;
      }

      // Validate vendors
      const validVendors = vendors.filter((v) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return v.name && v.email && emailRegex.test(v.email);
      });

      if (validVendors.length === 0) {
        setError(
          "No valid vendors found. Please ensure your file has Name and Email columns."
        );
        setIsLoading(false);
        return;
      }

      if (validVendors.length < vendors.length) {
        setError(
          `${
            vendors.length - validVendors.length
          } row(s) skipped due to missing or invalid data`
        );
      }

      setPreview(validVendors);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse file. Please check the format."
      );
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = () => {
    if (preview && preview.length > 0) {
      onVendorsImported(preview);
      setPreview(null);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Vendors from File</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with vendor information. File should
            contain Name, Email, and optionally Tags columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          {!preview && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full h-full min-h-[120px]"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">
                      {isLoading
                        ? "Processing file..."
                        : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV or Excel files (XLSX, XLS)
                    </p>
                  </div>
                </Button>
              </div>

              {/* Template Example */}
              <Card className="bg-muted/50 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm">File Format Example</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs font-mono space-y-1">
                    <div className="text-muted-foreground">
                      Name, Email, Tags
                    </div>
                    <div>Acme Corp, contact@acme.com, Premium,Hardware</div>
                    <div>Tech Solutions, sales@tech.com, Fast Delivery</div>
                    <div>Global Industries, info@global.com</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Ready to import {preview.length} vendor
                  {preview.length !== 1 ? "s" : ""}
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b">
                  <p className="text-sm font-semibold">Preview</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {preview.slice(0, 10).map((vendor, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 border-b last:border-b-0 text-sm hover:bg-muted/50"
                    >
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.email}
                      </p>
                      {vendor.tags && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tags: {vendor.tags}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {preview.length > 10 && (
                  <div className="px-4 py-2 bg-muted text-center text-xs text-muted-foreground">
                    ... and {preview.length - 10} more
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport}>
                  Import {preview.length} Vendors
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
