import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(({ id, title, description, action, dismiss, variant, ...props }) => {
				// Infer variant when not provided, based on common titles/descriptions
				const normalizedTitle = (title || '').toString().toLowerCase();
				const normalizedDesc = (description || '').toString().toLowerCase();
								let inferred = variant;
								if (!inferred) {
										const isError = /(erro|error|falha|negado|incorreto|invalido|offline|indisponivel)/;
										const isSuccess = /(sucesso|ok|feito|salvo|enviado|baixado|realizado|bem[- ]vindo)/;
										const isWarn = /(aviso|aten[cç][aã]o|cuidado)/;
										if (isError.test(normalizedTitle) || isError.test(normalizedDesc)) inferred = 'destructive';
										else if (isSuccess.test(normalizedTitle) || isSuccess.test(normalizedDesc)) inferred = 'success';
										else if (isWarn.test(normalizedTitle) || isWarn.test(normalizedDesc)) inferred = 'warning';
										else inferred = 'info';
								}
				const Icon = inferred === 'destructive' ? XCircle
				  : inferred === 'success' ? CheckCircle2
				  : inferred === 'warning' ? AlertTriangle
				  : Info;
				return (
										<Toast key={id} variant={inferred} {...props}>
												<div className="flex items-start gap-3">
						  <span className="mt-0.5">
							<Icon className="w-5 h-5" />
						  </span>
						  <div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && (
								<ToastDescription>{description}</ToastDescription>
							)}
						  </div>
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}