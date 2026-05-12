import { Link } from 'react-router-dom';
import { PageFooter, PageHeader } from '@presentation/components';

export const NotFoundPage = () => (
  <main className="page page-fit">
    <PageHeader />
    <section className="section-message">
      <p className="kicker">404</p>
      <h1 className="section-title">這一頁尚未翻開</h1>
      <p className="notfound-text">你尋找的頁面並不存在。請回到首頁，挑選你要閱讀的日子。</p>
      <Link to="/" className="btn-solid">
        回到首頁 →
      </Link>
    </section>
    <PageFooter />
  </main>
);
