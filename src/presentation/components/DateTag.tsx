export interface DateTagProps {
  readonly label: string;
  readonly large?: boolean;
}

export const DateTag = ({ label, large = false }: DateTagProps) => (
  <div className={large ? 'date-tag date-tag-large' : 'date-tag'}>{label}</div>
);
