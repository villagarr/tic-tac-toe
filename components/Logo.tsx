import { Mark } from './Mark';

/** X, O, X işaretleri çizilerek açılır; altında oyunun adı yazar. */
export function Logo() {
  return (
    <>
      <div className="logo" aria-hidden="true">
        <Mark sym="X" delays={['.1s', '.28s']} />
        <Mark sym="O" delays={['.5s']} />
        <Mark sym="X" delays={['.85s', '1.03s']} />
      </div>
      <h1 className="title">Tic Tac Toe</h1>
    </>
  );
}
