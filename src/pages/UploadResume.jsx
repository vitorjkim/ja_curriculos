import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { UploadCloud, FileText, CheckCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { resumes } from '@/lib/api';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const UploadResume = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
        maxFiles: 1
    });

    const extractTextFromPdf = async (arrayBuffer) => {
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
        }
        return text;
    };

    const extractTextFromFile = async (file) => {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    if (file.type === 'application/pdf') {
                        const text = await extractTextFromPdf(new Uint8Array(arrayBuffer));
                        resolve(text);
                    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        resolve(result.value);
                    } else {
                        reject(new Error('Formato de arquivo não suportado'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    const parseResumeText = (text) => {
        const resumeData = {
            name: '',
            email: '',
            phone: '',
            education: '',
            experiences: [],
            courses: [],
            languages: []
        };

        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const phoneRegex = /(\(?\d{2}\)?\s?)?(\d{4,5}-?\d{4})/;

        const emailMatch = text.match(emailRegex);
        if (emailMatch) resumeData.email = emailMatch[0];

        const phoneMatch = text.match(phoneRegex);
        if (phoneMatch) resumeData.phone = phoneMatch[0];

        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 0) {
            resumeData.name = lines[0].trim();
        }
        
        const remainingText = lines.slice(1).join('\n');
        resumeData.education = remainingText.substring(0, 500);

        return resumeData;
    };

    const handleUpload = async () => {
        if (!file) {
            toast({
                title: 'Nenhum arquivo selecionado',
                description: 'Por favor, selecione um arquivo para carregar.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            // Extrair texto do arquivo
            const extractedText = await extractTextFromFile(file);
            const parsedData = parseResumeText(extractedText);

            // Criar FormData para upload
            const formData = new FormData();
            formData.append('resumeFile', file);
            formData.append('extractedText', extractedText);
            formData.append('parsedData', JSON.stringify(parsedData));

            // Fazer upload usando o helper resumes.upload (tratamento de FormData feito no api.js)
            const result = await resumes.upload(formData);

            if (!result || !result.resume || !result.resume.id) {
                throw new Error('Resposta de upload inválida');
            }

            toast({
                title: 'Currículo carregado!',
                description: "O arquivo foi salvo e as informações foram extraídas. Revise e complete os dados.",
            });

            navigate(`/edit-resume/${result.resume.id}`);

        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            toast({
                title: 'Erro ao carregar arquivo',
                description: error.message || 'Não foi possível carregar o arquivo. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.type === 'company') {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <Card>
              <CardContent className="p-6 text-center">
                <p>Acesso restrito a candidatos.</p>
              </CardContent>
            </Card>
          </div>
        );
    }
    
    return (
        <>
            <Helmet>
                <title>Carregar Currículo - CurrículoJá</title>
                <meta name="description" content="Carregue seu currículo em formato PDF, DOC, ou DOCX para preenchimento rápido." />
            </Helmet>
            <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gray-50">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">
                    <Card className="card-hover">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl gradient-text">Carregar Currículo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-[var(--color1)] bg-[var(--color1)]/10' : 'border-gray-300 hover:border-gray-400'}`}>
                                <input {...getInputProps()} />
                                <UploadCloud className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p className="font-semibold text-gray-700">Clique para escolher seu arquivo</p>
                                <p className="text-sm text-gray-500 mt-1">ou arraste e solte aqui</p>
                                <p className="text-xs text-gray-400 mt-4">Formatos aceitos: PDF, DOC, DOCX</p>
                            </div>
                            
                            {file && (
                                <div className="p-4 border rounded-lg flex items-center justify-between bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-6 h-6 text-[var(--color1)]" />
                                        <div>
                                            <p className="font-medium text-sm">{file.name}</p>
                                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-600">
                                        <X className="w-5 h-5"/>
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button onClick={() => navigate('/create-resume')} variant="outline" className="w-full">
                                    Voltar
                                </Button>
                                <Button onClick={handleUpload} className="w-full btn-primary text-white" disabled={!file || loading}>
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                                    ) : (
                                        <><CheckCircle className="mr-2 h-4 w-4"/> Enviar Currículo</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </>
    );
};

export default UploadResume;