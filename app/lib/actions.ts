"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import postgres from "postgres";
import { redirect } from "next/navigation";

export type State = {
    errors?: IInvoiceErrors;
    message?: string | null;
};

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(["pending", "paid"]),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

interface IInvoiceErrors {
    customerId?: string;
    amount?: string;
    status?: string;
}

const invoiceErrorMessages: Record<keyof IInvoiceErrors, string> = {
    customerId: "Please select a customer",
    amount: "Please enter an amount greater that $0",
    status: "Please select an invoice status",
};

const getInvoiceValidateErrorsByZodErrors = (
    zodErrorsKeys: string[]
): IInvoiceErrors => {
    return zodErrorsKeys.reduce(
        (invoiceValidateErrors: IInvoiceErrors, zodErrorKey: string) => {
            const validateMessage: string =
                invoiceErrorMessages[zodErrorKey as keyof IInvoiceErrors];

            if (!Object.keys(invoiceValidateErrors).length) {
                return {
                    [zodErrorKey]: validateMessage,
                };
            }

            return { ...invoiceValidateErrors, [zodErrorKey]: validateMessage };
        },
        {} as IInvoiceErrors
    );
};

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    if (!validatedFields.success) {
        const zodErrors: any = validatedFields.error.flatten().fieldErrors;

        const validateErrors: IInvoiceErrors =
            getInvoiceValidateErrorsByZodErrors(Object.keys(zodErrors));

        return {
            errors: validateErrors,
            message: "Missing Fields. Failed to Create Invoice.",
        };
    }

    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];

    try {
        await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        console.error(error);
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    const amountInCents = amount * 100;

    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
    } catch (error) {
        // We'll log the error to the console for now
        console.error(error);
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath("/dashboard/invoices");
}
